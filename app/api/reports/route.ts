import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getReportsForUser, getReportsForProject, getReportsForDrawing, getReportsForSimulation } from '@/lib/db/queries';

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

    const body = await request.json();
    const { simulationId } = body;

    if (!simulationId || typeof simulationId !== 'number') {
      return NextResponse.json(
        { error: 'Simulation ID is required' },
        { status: 400 }
      );
    }

    // TODO: Implement report generation logic
    // This would typically:
    // 1. Verify the simulation exists and belongs to the user
    // 2. Call an external service or queue a job to generate the report
    // 3. Create a report record in the database
    // 4. Return the report information

    // For now, return a placeholder response
    return NextResponse.json(
      { error: 'Report generation not implemented yet' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
