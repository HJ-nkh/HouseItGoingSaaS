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
    console.log('✅ Data validated:', validatedData);

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
    console.log('✅ Project found:', projectCheck.id);

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
    console.log('✅ Drawing found:', drawingCheck.id);

    // Create a simple input hash
    const inputHash = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('� Input hash created:', inputHash);

    console.log('🆕 Creating new simulation...');
    // Minimal simulation creation
    const [newSimulation] = await db
      .insert(simulations)
      .values({
        userId: user.id,
        projectId: validatedData.projectId,
        drawingId: validatedData.drawingId,
        entities: validatedData.entities,
        inputHash: inputHash,
        status: 'pending' as const,
      })
      .returning();

    console.log('✅ Simulation created:', newSimulation.id);

    // Queue simulation for processing
    try {
      console.log('🚀 Queuing simulation...');
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
        userInfo: {
          userId: user.id,
          teamId: userWithTeam.teamId,
        },
      });
      console.log('✅ Simulation queued successfully');
    } catch (queueError) {
      console.error('❌ Error queuing simulation:', queueError);
      // Continue anyway - simulation is created, just not queued
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
