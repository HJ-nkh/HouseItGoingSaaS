import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, projects, drawings, simulations } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

export async function getProjectsForTeam() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return [];
  }

  return await db
    .select({
      id: projects.id,
      title: projects.title,
      address: projects.address,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      createdBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(projects)
    .leftJoin(users, eq(projects.createdBy, users.id))
    .where(eq(projects.teamId, userWithTeam.teamId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(projectId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return null;
  }

  const result = await db
    .select({
      id: projects.id,
      title: projects.title,
      address: projects.address,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      teamId: projects.teamId,
      createdBy: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(projects)
    .leftJoin(users, eq(projects.createdBy, users.id))
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.teamId, userWithTeam.teamId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getDrawingsForProject(projectId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First verify the user has access to this project
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found or access denied');
  }

  return await db
    .select({
      id: drawings.id,
      title: drawings.title,
      hasChanges: drawings.hasChanges,
      isTemplate: drawings.isTemplate,
      createdAt: drawings.createdAt,
      updatedAt: drawings.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(drawings)
    .leftJoin(users, eq(drawings.userId, users.id))
    .where(eq(drawings.projectId, projectId))
    .orderBy(desc(drawings.updatedAt));
}

export async function getDrawingById(drawingId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return null;
  }

  const result = await db
    .select({
      id: drawings.id,
      title: drawings.title,
      history: drawings.history,
      hasChanges: drawings.hasChanges,
      isTemplate: drawings.isTemplate,
      createdAt: drawings.createdAt,
      updatedAt: drawings.updatedAt,
      userId: drawings.userId,
      projectId: drawings.projectId,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      project: {
        id: projects.id,
        title: projects.title,
        teamId: projects.teamId,
      },
    })
    .from(drawings)
    .leftJoin(users, eq(drawings.userId, users.id))
    .leftJoin(projects, eq(drawings.projectId, projects.id))
    .where(
      and(
        eq(drawings.id, drawingId),
        eq(projects.teamId, userWithTeam.teamId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getDrawingsForUser() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return [];
  }

  return await db
    .select({
      id: drawings.id,
      title: drawings.title,
      hasChanges: drawings.hasChanges,
      isTemplate: drawings.isTemplate,
      createdAt: drawings.createdAt,
      updatedAt: drawings.updatedAt,
      project: {
        id: projects.id,
        title: projects.title,
      },
    })
    .from(drawings)
    .leftJoin(projects, eq(drawings.projectId, projects.id))
    .where(
      and(
        eq(drawings.userId, user.id),
        eq(projects.teamId, userWithTeam.teamId)
      )
    )
    .orderBy(desc(drawings.updatedAt));
}

export async function getSimulationsForProject(projectId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First verify the user has access to this project
  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error('Project not found or access denied');
  }

  return await db
    .select({
      id: simulations.id,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      inputHash: simulations.inputHash,
      createdAt: simulations.createdAt,
      updatedAt: simulations.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
    })
    .from(simulations)
    .leftJoin(users, eq(simulations.userId, users.id))
    .leftJoin(drawings, eq(simulations.drawingId, drawings.id))
    .where(eq(simulations.projectId, projectId))
    .orderBy(desc(simulations.createdAt));
}

export async function getSimulationsForDrawing(drawingId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First verify the user has access to this drawing
  const drawing = await getDrawingById(drawingId);
  if (!drawing) {
    throw new Error('Drawing not found or access denied');
  }

  return await db
    .select({
      id: simulations.id,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      inputHash: simulations.inputHash,
      createdAt: simulations.createdAt,
      updatedAt: simulations.updatedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(simulations)
    .leftJoin(users, eq(simulations.userId, users.id))
    .where(eq(simulations.drawingId, drawingId))
    .orderBy(desc(simulations.createdAt));
}

export async function getSimulationById(simulationId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return null;
  }

  const result = await db
    .select({
      id: simulations.id,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      entities: simulations.entities,
      inputHash: simulations.inputHash,
      result: simulations.result,
      createdAt: simulations.createdAt,
      updatedAt: simulations.updatedAt,
      userId: simulations.userId,
      projectId: simulations.projectId,
      drawingId: simulations.drawingId,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
      project: {
        id: projects.id,
        title: projects.title,
        teamId: projects.teamId,
      },
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
    })
    .from(simulations)
    .leftJoin(users, eq(simulations.userId, users.id))
    .leftJoin(projects, eq(simulations.projectId, projects.id))
    .leftJoin(drawings, eq(simulations.drawingId, drawings.id))
    .where(
      and(
        eq(simulations.id, simulationId),
        eq(projects.teamId, userWithTeam.teamId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function getSimulationsForUser() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return [];
  }

  return await db
    .select({
      id: simulations.id,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      inputHash: simulations.inputHash,
      createdAt: simulations.createdAt,
      updatedAt: simulations.updatedAt,
      project: {
        id: projects.id,
        title: projects.title,
      },
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
    })
    .from(simulations)
    .leftJoin(projects, eq(simulations.projectId, projects.id))
    .leftJoin(drawings, eq(simulations.drawingId, drawings.id))
    .where(
      and(
        eq(simulations.userId, user.id),
        eq(projects.teamId, userWithTeam.teamId)
      )
    )
    .orderBy(desc(simulations.createdAt));
}
