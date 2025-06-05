import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getSimulationsForUser, getSimulationsForProject, getSimulationsForDrawing } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { simulations, activityLogs, ActivityType, SimulationStatus } from '@/lib/db/schema';
import { z } from 'zod';
import crypto from 'crypto';
import { queueSimulation } from '@/lib/services/simulation';

const createSimulationSchema = z.object({
  projectId: z.number(),
  drawingId: z.number(),
  entities: z.any(), // This would be the EntitySet in TypeScript
});

// Helper function to create a hash from an object (similar to hash_dict in Python)
function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const drawingId = searchParams.get('drawingId');
    const limit = searchParams.get('limit');

    let simulationsList;

    if (projectId) {
      simulationsList = await getSimulationsForProject(parseInt(projectId));
    } else if (drawingId) {
      simulationsList = await getSimulationsForDrawing(parseInt(drawingId));
    } else {
      simulationsList = await getSimulationsForUser();
    }

    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum)) {
        simulationsList = simulationsList.slice(0, limitNum);
      }
    }

    return NextResponse.json(simulationsList);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching simulations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createSimulationSchema.parse(body);

    // Verify the project and drawing belong to the user's team
    const projectCheck = await db.query.projects.findFirst({
      where: (projects, { eq, and }) => and(
        eq(projects.id, validatedData.projectId),
        eq(projects.teamId, userWithTeam.teamId!)
      )
    });

    if (!projectCheck) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    const drawingCheck = await db.query.drawings.findFirst({
      where: (drawings, { eq, and }) => and(
        eq(drawings.id, validatedData.drawingId),
        eq(drawings.projectId, validatedData.projectId)
      )
    });

    if (!drawingCheck) {
      return NextResponse.json(
        { error: 'Drawing not found or access denied' },
        { status: 404 }
      );
    }

    // Create input hash similar to the Python implementation
    // Include project data and entities data
    const project = {
      id: projectCheck.id,
      title: projectCheck.title,
      address: projectCheck.address,
      teamId: projectCheck.teamId,
      createdBy: projectCheck.createdBy,
    };
    
    const inputHash = hashObject({ 
      ...validatedData.entities, 
      ...project 
    });

    // Check for existing simulation with the same hash and completed status
    const existingSimulation = await db.query.simulations.findFirst({
      where: (simulations, { eq, and }) => and(
        eq(simulations.inputHash, inputHash),
        eq(simulations.userId, user.id),
        eq(simulations.status, SimulationStatus.COMPLETED)
      )
    });

    if (existingSimulation) {
      console.log('Found existing completed simulation');
      return NextResponse.json(existingSimulation, { status: 200 });
    }

    // Create new simulation
    const [newSimulation] = await db
      .insert(simulations)
      .values({
        userId: user.id,
        projectId: validatedData.projectId,
        drawingId: validatedData.drawingId,
        entities: validatedData.entities,
        inputHash: inputHash,
        status: SimulationStatus.PENDING,
      })
      .returning();

    // Log the activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.CREATE_SIMULATION}: Simulation ${newSimulation.id}`,
      ipAddress: undefined,
    });

    console.log('Created simulation', newSimulation.id);

    // Queue simulation for processing
    await queueSimulation({
      simulationId: newSimulation.id,
      entities: validatedData.entities,
      projectData: {
        id: projectCheck.id,
        title: projectCheck.title,
        address: projectCheck.address,
        teamId: projectCheck.teamId,
        createdBy: projectCheck.createdBy,
      },
    });

    return NextResponse.json(newSimulation, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating simulation:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
