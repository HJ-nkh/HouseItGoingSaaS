import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getReportsForUser, getReportsForProject, getReportsForDrawing, getReportsForSimulation } from '@/lib/db/queries';
import { z } from 'zod';

const createReportSchema = z.object({
  simulationId: z.coerce.number(),
  title: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const drawingId = searchParams.get('drawingId');
    const simulationId = searchParams.get('simulationId');

    let reportsList;

    if (projectId) {
      reportsList = await getReportsForProject(parseInt(projectId));
    } else if (drawingId) {
      reportsList = await getReportsForDrawing(parseInt(drawingId));
    } else if (simulationId) {
      reportsList = await getReportsForSimulation(parseInt(simulationId));
    } else {
      reportsList = await getReportsForUser();
    }

    return NextResponse.json(reportsList);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching reports:', error);
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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const validatedData = createReportSchema.parse(body);

    // Import db and schema components
    const { db } = await import('@/lib/db/drizzle');
    const { reports, activityLogs, ActivityType } = await import('@/lib/db/schema');

    // Verify the simulation exists and belongs to the user
    const simulation = await db.query.simulations.findFirst({
      where: (simulations, { eq, and }) => and(
        eq(simulations.id, validatedData.simulationId),
        eq(simulations.userId, user.id)
      )
    });

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found or access denied' },
        { status: 404 }
      );
    }

    // Generate a simple report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create report record
    const [newReport] = await db
      .insert(reports)
      .values({
        id: reportId,
        userId: user.id,
        projectId: simulation.projectId,
        drawingId: simulation.drawingId,
        simulationId: validatedData.simulationId,
        title: validatedData.title || `Report for Simulation ${validatedData.simulationId}`,
      })
      .returning();

    // Log the activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.CREATE_REPORT}: ${newReport.title}`,
      ipAddress: undefined,
    });

    return NextResponse.json(newReport, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
