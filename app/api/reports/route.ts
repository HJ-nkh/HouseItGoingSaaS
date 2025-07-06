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

    // Verify the simulation exists and belongs to the user's team
    const simulation = await db.query.simulations.findFirst({
      where: (simulations, { eq, and }) => and(
        eq(simulations.id, validatedData.simulationId),
        eq(simulations.teamId, userWithTeam.teamId!)
      )
    });

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found or access denied' },
        { status: 404 }
      );
    }

    // Skip lambda invocation in development mode
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('🔧 Development mode: Skipping report generation lambda invocation');
    //   return NextResponse.json(
    //     { error: 'Report generation not available in development mode' },
    //     { status: 501 }
    //   );
    // }

    // Get the Lambda function URL from environment variables
    const lambdaUrl = process.env.GENERATE_REPORT_LAMBDA_URL;
    const apiKey = process.env.LAMBDA_API_KEY;
    
    if (!lambdaUrl) {
      return NextResponse.json(
        { error: 'Report generation service not configured' },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Prepare the payload for the Lambda function
    // This matches the Python Lambda function's expected input format
    const lambdaPayload = {
      user_id: user.id,
      simulation_id: validatedData.simulationId,
      team_id: userWithTeam.teamId
    };

    // Invoke the Lambda function via HTTP Function URL
    // The Lambda function will:
    // 1. Validate the API key
    // 2. Create the report document and upload to S3
    // 3. Insert the report record into the database
    // 4. Return the report_id
    let lambdaResponse;
    try {
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(lambdaPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lambda function error:', errorText);
        return NextResponse.json(
          { error: 'Failed to generate report' },
          { status: 500 }
        );
      }

      lambdaResponse = await response.json();
    } catch (error) {
      console.error('Error invoking Lambda function:', error);
      return NextResponse.json(
        { error: 'Failed to invoke report generation service' },
        { status: 500 }
      );
    }

    console.log('Lambda response:', lambdaResponse);

    // Extract the report ID from the Lambda response
    const reportId = lambdaResponse.report_id;
    if (!reportId) {
      console.error('Lambda response missing report_id:', lambdaResponse);
      return NextResponse.json(
        { error: 'Invalid response from report generation service' },
        { status: 500 }
      );
    }

    // The Lambda function has already created the report in the database,
    // so we need to fetch it to return to the client
    const newReport = await db.query.reports.findFirst({
      where: (reports, { eq }) => eq(reports.id, reportId)
    });

    if (!newReport) {
      console.error('Report not found in database after Lambda execution:', reportId);
      return NextResponse.json(
        { error: 'Report creation failed' },
        { status: 500 }
      );
    }

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
