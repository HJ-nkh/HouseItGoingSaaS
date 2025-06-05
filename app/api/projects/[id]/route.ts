import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, ActivityType, activityLogs } from '@/lib/db/schema';
import { getUser, getUserWithTeam, getProjectById } from '@/lib/db/queries';
import { eq, and } from 'drizzle-orm';

// Activity logging function
async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }

  await db.insert(activityLogs).values({
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || null,
  });
}

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a specific project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        { error: 'User is not part of a team' },
        { status: 400 }
      );
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to user's team
    const existingProject = await getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { title, address } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Project title is required' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null;
    }

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.teamId, userWithTeam.teamId)
        )
      )
      .returning();

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.UPDATE_PROJECT,
      request.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a specific project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        { error: 'User is not part of a team' },
        { status: 400 }
      );
    }

    const projectId = parseInt(params.id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to user's team
    const existingProject = await getProjectById(projectId);
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await db
      .delete(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.DELETE_PROJECT,
      request.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}