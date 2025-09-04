import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getSimulationsForUser, getSimulationsForProject, getSimulationsForDrawing } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { simulations, activityLogs, ActivityType } from '@/lib/db/schema';
import { z } from 'zod';
import crypto from 'crypto';
import { and, eq, isNull, ne } from 'drizzle-orm';

// Disable caching for this route in Next/Vercel and internal fetch cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    return NextResponse.json(simulationsList, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Surrogate-Control': 'no-store',
          },
        }
      );
    }
    console.error('Error fetching simulations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
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

    console.log('🆕 Creating new simulation (and pruning older for this drawing)...');
    // Create new simulation and soft-delete previous ones for same team/drawing in a transaction
    const newSimulation = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(simulations)
        .values({
          teamId: userWithTeam.teamId!,
          projectId: validatedData.projectId,
          drawingId: validatedData.drawingId,
          entities: validatedData.entities,
          inputHash: inputHash,
          status: 'pending' as const,
        })
        .returning();

      // Soft-delete any previous non-deleted simulations for this drawing/team
      await tx
        .update(simulations)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(simulations.teamId, userWithTeam.teamId!),
            eq(simulations.drawingId, validatedData.drawingId),
            isNull(simulations.deletedAt),
            ne(simulations.id, created.id)
          )
        );

      return created;
    });

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
    const lambdaApiKey = process.env.LAMBDA_API_KEY;

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
        throw new Error(`Lambda invocation failed: ${lambdaResponse.status} ${lambdaResponse.statusText}`);
      }
      
      const responseData = await lambdaResponse.text();
      console.log('✅ Lambda invocation response:', responseData);
      
    } catch (lambdaError) {
      console.error('❌ Error invoking Lambda function:', lambdaError);
      // Continue anyway - simulation is created, just not processed
      // You might want to update simulation status to 'failed' here
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
