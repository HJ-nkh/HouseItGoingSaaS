import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getSimulationsForUser, getSimulationsForProject, getSimulationsForDrawing } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { simulations, activityLogs, ActivityType } from '@/lib/db/schema';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
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

    // Keep only the latest simulation for this drawing and team
    try {
      await db
        .delete(simulations)
        .where(
          and(
            eq(simulations.teamId, userWithTeam.teamId!),
            eq(simulations.drawingId, validatedData.drawingId),
            ne(simulations.id, newSimulation.id),
          ),
        );
      console.log('🧹 Removed older simulations for drawing', validatedData.drawingId);
    } catch (e) {
      console.warn('⚠️ Failed to remove older simulations:', e instanceof Error ? e.message : e);
    }

    // Diagnostics: confirm the row is visible before invoking Lambda
    console.log('🧾 Created simulation details:', { id: newSimulation.id, teamId: userWithTeam.teamId });
    try {
      const verify = await db.query.simulations.findFirst({
        where: (s, { eq }) => eq(s.id, newSimulation.id)
      });
      console.log('🔎 Visibility check:', { exists: !!verify, id: newSimulation.id, teamId: verify?.teamId });
      // App-side DB diagnostics to compare with Lambda's probe
      try {
        const host = new URL(process.env.DATABASE_URL!).hostname;
        const last5 = await db.select({ id: simulations.id }).from(simulations).orderBy(desc(simulations.id)).limit(5);
        const stats = await db.execute(sql`select count(*)::int as count, max(id)::int as "maxId" from public.simulations`);
        const row = Array.isArray(stats) ? (stats[0] as any) : (stats as any);
        const count = row?.count;
        const maxId = row?.maxId;
        console.log('🧪 App DB view:', { host, count, maxId, last5: last5.map(r => r.id) });
      } catch (e) {
        console.warn('⚠️ App DB diagnostics failed:', e instanceof Error ? e.message : e);
      }
    } catch (e) {
      console.warn('⚠️ Visibility check failed:', e instanceof Error ? e.message : e);
    }

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
      
      // Optional small delay to mitigate rare read-after-write races (configurable)
      const delayMsRaw = process.env.LAMBDA_INVOKE_DELAY_MS;
      const delayMs = delayMsRaw ? parseInt(delayMsRaw) : 0;
      if (!Number.isNaN(delayMs) && delayMs > 0) {
        console.log(`⏱️ Delay before invoking Lambda: ${delayMs} ms`);
        await new Promise((res) => setTimeout(res, delayMs));
      }

      const payload = {
        simulation_id: newSimulation.id,
        team_id: userWithTeam.teamId,
      };
      console.log('📦 Lambda payload:', payload);
      
      const lambdaResponse = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': lambdaApiKey,
        },
        body: JSON.stringify(payload),
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
