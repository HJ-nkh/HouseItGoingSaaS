import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { projects, ActivityType, activityLogs } from '@/lib/db/schema';
import { getUser, getUserWithTeam, getProjectsForTeam } from '@/lib/db/queries';

// Activity logging function (moved from actions.ts)
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

// GET /api/projects - Get all projects for user's team
export async function GET() {
  try {
    const projectsList = await getProjectsForTeam();
    return NextResponse.json(projectsList);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
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
        { error: 'User is not part of a team' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, address } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project title is required' },
        { status: 400 }
      );
    }

    const [newProject] = await db
      .insert(projects)
      .values({
        title: title.trim(),
        address: address?.trim() || null,
        teamId: userWithTeam.teamId,
        createdBy: user.id,
      })
      .returning();

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.CREATE_PROJECT,
      request.headers.get('x-forwarded-for') || undefined
    );

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}