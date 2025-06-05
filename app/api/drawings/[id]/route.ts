import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam, getDrawingById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { drawings, activityLogs, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateDrawingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  history: z.any().optional(),
  hasChanges: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) {
      return NextResponse.json(
        { error: 'Invalid drawing ID' },
        { status: 400 }
      );
    }

    const drawing = await getDrawingById(drawingId);
    if (!drawing) {
      return NextResponse.json(
        { error: 'Drawing not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(drawing);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Error fetching drawing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) {
      return NextResponse.json(
        { error: 'Invalid drawing ID' },
        { status: 400 }
      );
    }

    const existingDrawing = await getDrawingById(drawingId);
    if (!existingDrawing) {
      return NextResponse.json(
        { error: 'Drawing not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateDrawingSchema.parse(body);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }
    if (validatedData.history !== undefined) {
      updateData.history = validatedData.history;
    }
    if (validatedData.hasChanges !== undefined) {
      updateData.hasChanges = validatedData.hasChanges;
    }
    if (validatedData.isTemplate !== undefined) {
      updateData.isTemplate = validatedData.isTemplate;
    }

    const [updatedDrawing] = await db
      .update(drawings)
      .set(updateData)
      .where(eq(drawings.id, drawingId))
      .returning();

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.UPDATE_DRAWING}: ${updatedDrawing.title}`,
      ipAddress: undefined,
    });

    return NextResponse.json(updatedDrawing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating drawing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const drawingId = parseInt(id);
    if (isNaN(drawingId)) {
      return NextResponse.json(
        { error: 'Invalid drawing ID' },
        { status: 400 }
      );
    }

    const existingDrawing = await getDrawingById(drawingId);
    if (!existingDrawing) {
      return NextResponse.json(
        { error: 'Drawing not found' },
        { status: 404 }
      );
    }

    await db.delete(drawings).where(eq(drawings.id, drawingId));

    await db.insert(activityLogs).values({
      teamId: userWithTeam.teamId,
      userId: user.id,
      action: `${ActivityType.DELETE_DRAWING}: ${existingDrawing.title}`,
      ipAddress: undefined,
    });

    return NextResponse.json({ message: 'Drawing deleted successfully' });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
