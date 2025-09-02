import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getSimulationsForUser, getSimulationsForProject, getSimulationsForDrawing } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { simulations, activityLogs, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const createSimulationSchema = z.object({
  projectId: z.coerce.number(),
  drawingId: z.coerce.number(),
  entities: z.any(), // This would be the EntitySet in TypeScript
});

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
    console.log('📥 Simulation creation started');
    
    const user = await getUser();
    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('✅ User found:', user.id);

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      console.log('❌ User not associated with team');
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 403 }
      );
    }
    console.log('✅ User team found:', userWithTeam.teamId);

    let body;
    try {
      body = await request.json();
      console.log('📄 Request body:', body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const validatedData = createSimulationSchema.parse(body);

    // Simple project check
    const projectCheck = await db.query.projects.findFirst({
      where: (projects, { eq, and }) => and(
        eq(projects.id, validatedData.projectId),
        eq(projects.teamId, userWithTeam.teamId!)
      )
    });

    if (!projectCheck) {
      console.log('❌ Project not found');
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    // Simple drawing check  
    const drawingCheck = await db.query.drawings.findFirst({
      where: (drawings, { eq, and }) => and(
        eq(drawings.id, validatedData.drawingId),
        eq(drawings.projectId, validatedData.projectId)
      )
    });

    if (!drawingCheck) {
      console.log('❌ Drawing not found');
      return NextResponse.json(
        { error: 'Drawing not found or access denied' },
        { status: 404 }
      );
    }

    // Create a deterministic hash from the input data
    const hashableData = {
      projectId: validatedData.projectId,
      drawingId: validatedData.drawingId,
      entities: validatedData.entities,
    };
    const jsonString = JSON.stringify(hashableData, Object.keys(hashableData).sort());
    const inputHash = crypto.createHash('sha256').update(jsonString).digest('hex');

    console.log('🆕 Creating new simulation...');
    // Minimal simulation creation
    const [newSimulation] = await db
      .insert(simulations)
      .values({
        teamId: userWithTeam.teamId,
        projectId: validatedData.projectId,
        drawingId: validatedData.drawingId,
        entities: validatedData.entities,
        inputHash: inputHash,
        status: 'pending' as const,
      })
      .returning();

    console.log('✅ Simulation created:', newSimulation.id);

    // Log the activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: ActivityType.CREATE_SIMULATION,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    // Skip lambda invocation in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Skipping lambda invocation');
      return NextResponse.json(newSimulation, { status: 202 });
    }

  const lambdaUrl = process.env.RUN_SIMULATION_LAMBDA_URL;
  // Support both env var names so prod/staging can be configured either way
  const lambdaApiKey = process.env.LAMBDA_API_KEY || process.env.API_KEY;

    try {
      if (!lambdaUrl) {
        throw new Error('RUN_SIMULATION_LAMBDA_URL environment variable is not set');
      }
      
      if (!lambdaApiKey) {
        throw new Error('LAMBDA_API_KEY environment variable is not set');
      }
      
  const lambdaResponse = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': lambdaApiKey,
        },
        body: JSON.stringify({
          simulation_id: newSimulation.id,
          team_id: userWithTeam.teamId,
        }),
      });

      console.log('📡 Invoked lambda function:', lambdaUrl);
      
      if (!lambdaResponse.ok) {
        const errText = await lambdaResponse.text().catch(() => '');
        const reqId = lambdaResponse.headers.get('x-amzn-requestid') || lambdaResponse.headers.get('x-amzn-request-id') || undefined;
        const errType = lambdaResponse.headers.get('x-amzn-errortype') || undefined;
        const extra = [errType ? `ErrorType=${errType}` : null, reqId ? `RequestId=${reqId}` : null].filter(Boolean).join(' ');
        throw new Error(`Lambda invocation failed: ${lambdaResponse.status} ${lambdaResponse.statusText}${extra ? ` (${extra})` : ''}${errText ? ` - ${errText}` : ''}`);
      }

      const responseData = await lambdaResponse.text();
      console.log('✅ Lambda invocation response:', responseData);
      
    } catch (lambdaError) {
      console.error('❌ Error invoking Lambda function:', lambdaError);
      // Mark the simulation as failed so the UI doesn't spin forever
      try {
        const [updated] = await db
          .update(simulations)
          .set({
            status: 'failed',
            error: lambdaError instanceof Error ? lambdaError.message : 'Lambda invocation failed',
            updatedAt: new Date(),
          })
          .where(eq(simulations.id, newSimulation.id))
          .returning();

        // Log activity for failure
        await db.insert(activityLogs).values({
          teamId: userWithTeam.teamId,
          userId: user.id,
          action: `${ActivityType.FAIL_SIMULATION}: Simulation ${newSimulation.id}`,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        console.warn('⚠️ Marked simulation as failed due to lambda error', { id: updated?.id });
      } catch (markFailErr) {
        console.error('❌ Additionally failed to mark simulation as failed:', markFailErr);
      }
    }

    console.log('📤 Returning simulation response');
    return NextResponse.json(newSimulation, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('❌ Error creating simulation:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
