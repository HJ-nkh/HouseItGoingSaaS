import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getDrawingsForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { drawings, activityLogs, ActivityType } from '@/lib/db/schema';
import { z } from 'zod';

const createDrawingSchema = z.object({
  projectId: z.number(),
  title: z.string().min(1).max(255),
  history: z.any(),
  hasChanges: z.boolean().optional().default(false),
  isTemplate: z.boolean().optional().default(false),
});

export async function GET() {
  try {
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

    const body = await request.json();
    const validatedData = createDrawingSchema.parse(body);

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
        userId: user.id,
        projectId: validatedData.projectId,
        title: validatedData.title,
        history: validatedData.history,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating drawing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
