import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getSimulationById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { simulations, activityLogs, ActivityType, SimulationStatus } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSimulationSchema = z.object({
  status: z.nativeEnum(SimulationStatus).optional(),
  result: z.any().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id);
    if (isNaN(simulationId)) {
      return NextResponse.json(
        { error: 'Invalid simulation ID' },
        { status: 400 }
      );
    }

    const simulation = await getSimulationById(simulationId);
    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(simulation);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching simulation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const simulationId = parseInt(id);
    if (isNaN(simulationId)) {
      return NextResponse.json(
        { error: 'Invalid simulation ID' },
        { status: 400 }
      );
    }

    // Verify the simulation exists and user has access
    const existingSimulation = await getSimulationById(simulationId);
    if (!existingSimulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this simulation
    if (existingSimulation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await db.delete(simulations).where(eq(simulations.id, simulationId));

    // Log the activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.DELETE_SIMULATION}: Simulation ${simulationId}`,
      ipAddress: undefined,
    });

    return NextResponse.json({ message: 'Simulation deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting simulation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const simulationId = parseInt(id);
    if (isNaN(simulationId)) {
      return NextResponse.json(
        { error: 'Invalid simulation ID' },
        { status: 400 }
      );
    }

    // Verify the simulation exists and user has access
    const existingSimulation = await getSimulationById(simulationId);
    if (!existingSimulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this simulation
    if (existingSimulation.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateSimulationSchema.parse(body);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.result !== undefined) {
      updateData.result = validatedData.result;
    }

    const [updatedSimulation] = await db
      .update(simulations)
      .set(updateData)
      .where(eq(simulations.id, simulationId))
      .returning();

    // Log appropriate activity based on status change
    let activityType = ActivityType.UPDATE_SIMULATION;
    if (validatedData.status === SimulationStatus.RUNNING) {
      activityType = ActivityType.START_SIMULATION;
    } else if (validatedData.status === SimulationStatus.COMPLETED) {
      activityType = ActivityType.COMPLETE_SIMULATION;
    } else if (validatedData.status === SimulationStatus.FAILED) {
      activityType = ActivityType.FAIL_SIMULATION;
    }

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${activityType}: Simulation ${simulationId}`,
      ipAddress: undefined,
    });

    return NextResponse.json(updatedSimulation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating simulation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
