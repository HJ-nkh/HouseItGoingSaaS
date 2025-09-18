import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getDrawingsForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { drawings, activityLogs, ActivityType } from '@/lib/db/schema';
import { z } from 'zod';

const createDrawingSchema = z.object({
  projectId: z.coerce.number(),
  title: z.string().min(1).max(255),
  // Make history optional to avoid 500 if client sends null/undefined; we'll default it
  history: z.any().optional(),
  hasChanges: z.boolean().optional().default(false),
  isTemplate: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get('projectId');
    
    if (projectIdParam) {
      const projectId = parseInt(projectIdParam);
      if (isNaN(projectId)) {
        return NextResponse.json(
          { error: 'Invalid project ID parameter' },
          { status: 400 }
        );
      }
      
      // Use the existing getDrawingsForProject function
      const { getDrawingsForProject } = await import('@/lib/db/queries');
      const drawingsList = await getDrawingsForProject(projectId);
      return NextResponse.json(drawingsList);
    }
    
    const drawingsList = await getDrawingsForUser();
    return NextResponse.json(drawingsList);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching drawings:', error);
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

    const validatedData = createDrawingSchema.parse(body);

    // Normalize / default history so DB not-null constraint is satisfied
    const safeHistory = ((): any => {
      let h = validatedData.history;
      if (h === null || h === undefined || h === '') {
        return { entities: [], actions: [] };
      }
      if (typeof h === 'string') {
        try {
          h = JSON.parse(h);
        } catch {
          // If it's a plain string that's not JSON, wrap it so we still store something structured
          h = { entities: [], actions: [], raw: h };
        }
      }
      return h;
    })();

    // Quick serializability check to surface clearer 400 instead of PG error
    try {
      JSON.stringify(safeHistory);
    } catch {
      return NextResponse.json(
        { error: 'History must be JSON serializable' },
        { status: 400 }
      );
    }

    // Verify the project belongs to the user's team
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

    const [newDrawing] = await db
      .insert(drawings)
      .values({
        teamId: userWithTeam.teamId,
        projectId: validatedData.projectId,
        title: validatedData.title,
        history: safeHistory,
        hasChanges: validatedData.hasChanges,
        isTemplate: validatedData.isTemplate,
      })
      .returning();

    // Log the activity
    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.CREATE_DRAWING}: ${validatedData.title}`,
      ipAddress: undefined,
    });

    return NextResponse.json(newDrawing, { status: 201 });
  } catch (error) {
    const debug = process.env.DRAWINGS_DEBUG === '1';
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    // Surface Postgres not-null violation more clearly if it still occurs for some reason
    if (error instanceof Error && /null value in column "history"/i.test(error.message)) {
      return NextResponse.json(
        { error: 'History is required' },
        { status: 400 }
      );
    }
    console.error('Error creating drawing:', error);
    return NextResponse.json(
      debug && error instanceof Error
        ? { error: 'Internal Server Error', message: error.message, stack: error.stack }
        : { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
