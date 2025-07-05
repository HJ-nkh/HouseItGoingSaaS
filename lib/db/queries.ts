import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, projects, drawings, simulations, reports } from './schema';
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
    .where(and(eq(projects.teamId, userWithTeam.teamId), isNull(projects.deletedAt)))
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
        eq(projects.teamId, userWithTeam.teamId),
        isNull(projects.deletedAt)
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
      projectId: drawings.projectId,
      title: drawings.title,
      history: drawings.history,
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
    .where(and(eq(drawings.projectId, projectId), isNull(drawings.deletedAt)))
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
        eq(projects.teamId, userWithTeam.teamId),
        isNull(drawings.deletedAt),
        isNull(projects.deletedAt)
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
      projectId: drawings.projectId,
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
        eq(projects.teamId, userWithTeam.teamId),
        isNull(drawings.deletedAt),
        isNull(projects.deletedAt)
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
      projectId: simulations.projectId,
      drawingId: simulations.drawingId,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      inputHash: simulations.inputHash,
      result: simulations.result,
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
    .where(and(eq(simulations.projectId, projectId), isNull(simulations.deletedAt), isNull(drawings.deletedAt)))
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
      result: simulations.result,
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
    .where(and(eq(simulations.drawingId, drawingId), isNull(simulations.deletedAt)))
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
        eq(projects.teamId, userWithTeam.teamId),
        isNull(simulations.deletedAt),
        isNull(projects.deletedAt),
        isNull(drawings.deletedAt)
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
      projectId: simulations.projectId,
      drawingId: simulations.drawingId,
      status: simulations.status,
      startTime: simulations.startTime,
      endTime: simulations.endTime,
      error: simulations.error,
      inputHash: simulations.inputHash,
      result: simulations.result,
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
        eq(projects.teamId, userWithTeam.teamId),
        isNull(simulations.deletedAt),
        isNull(projects.deletedAt),
        isNull(drawings.deletedAt)
      )
    )
    .orderBy(desc(simulations.createdAt));
}

export async function getReportsForUser() {
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
      id: reports.id,
      projectId: reports.projectId,
      drawingId: reports.drawingId,
      simulationId: reports.simulationId,
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      project: {
        id: projects.id,
        title: projects.title,
      },
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
      simulation: {
        id: simulations.id,
        status: simulations.status,
      },
    })
    .from(reports)
    .leftJoin(projects, eq(reports.projectId, projects.id))
    .leftJoin(drawings, eq(reports.drawingId, drawings.id))
    .leftJoin(simulations, eq(reports.simulationId, simulations.id))
    .where(
      and(
        eq(reports.userId, user.id),
        eq(projects.teamId, userWithTeam.teamId),
        isNull(reports.deletedAt),
        isNull(projects.deletedAt),
        isNull(drawings.deletedAt),
        isNull(simulations.deletedAt)
      )
    )
    .orderBy(desc(reports.createdAt));
}

export async function getReportsForProject(projectId: number) {
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
      id: reports.id,
      projectId: reports.projectId,
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
      simulation: {
        id: simulations.id,
        status: simulations.status,
      },
    })
    .from(reports)
    .leftJoin(drawings, eq(reports.drawingId, drawings.id))
    .leftJoin(simulations, eq(reports.simulationId, simulations.id))
    .where(and(eq(reports.projectId, projectId), isNull(reports.deletedAt), isNull(drawings.deletedAt), isNull(simulations.deletedAt)))
    .orderBy(desc(reports.createdAt));
}

export async function getReportsForDrawing(drawingId: number) {
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
      id: reports.id,
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      simulation: {
        id: simulations.id,
        status: simulations.status,
      },
    })
    .from(reports)
    .leftJoin(simulations, eq(reports.simulationId, simulations.id))
    .where(and(eq(reports.drawingId, drawingId), isNull(reports.deletedAt), isNull(simulations.deletedAt)))
    .orderBy(desc(reports.createdAt));
}

export async function getReportsForSimulation(simulationId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // First verify the user has access to this simulation
  const simulation = await getSimulationById(simulationId);
  if (!simulation) {
    throw new Error('Simulation not found or access denied');
  }

  return await db
    .select({
      id: reports.id,
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
    })
    .from(reports)
    .where(and(eq(reports.simulationId, simulationId), isNull(reports.deletedAt)))
    .orderBy(desc(reports.createdAt));
}

export async function getReportById(reportId: string) {
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
      id: reports.id,
      title: reports.title,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      userId: reports.userId,
      projectId: reports.projectId,
      drawingId: reports.drawingId,
      simulationId: reports.simulationId,
      project: {
        id: projects.id,
        title: projects.title,
        teamId: projects.teamId,
      },
      drawing: {
        id: drawings.id,
        title: drawings.title,
      },
      simulation: {
        id: simulations.id,
        status: simulations.status,
      },
    })
    .from(reports)
    .leftJoin(projects, eq(reports.projectId, projects.id))
    .leftJoin(drawings, eq(reports.drawingId, drawings.id))
    .leftJoin(simulations, eq(reports.simulationId, simulations.id))
    .where(
      and(
        eq(reports.id, reportId),
        eq(projects.teamId, userWithTeam.teamId),
        isNull(reports.deletedAt),
        isNull(projects.deletedAt),
        isNull(drawings.deletedAt),
        isNull(simulations.deletedAt)
      )
    )
    .limit(1);

  return result[0] || null;
}

// Utility functions for soft delete operations
export async function softDeleteProject(projectId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    throw new Error('User not associated with a team');
  }

  return await db
    .update(projects)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.teamId, userWithTeam.teamId),
        isNull(projects.deletedAt)
      )
    );
}

export async function softDeleteDrawing(drawingId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    throw new Error('User not associated with a team');
  }

  return await db
    .update(drawings)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(drawings.id, drawingId),
        isNull(drawings.deletedAt)
      )
    );
}

export async function softDeleteSimulation(simulationId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .update(simulations)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(simulations.id, simulationId),
        eq(simulations.userId, user.id),
        isNull(simulations.deletedAt)
      )
    );
}

export async function softDeleteReport(reportId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .update(reports)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reports.id, reportId),
        eq(reports.userId, user.id),
        isNull(reports.deletedAt)
      )
    );
}

// Restore functions (for potential future use)
export async function restoreProject(projectId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    throw new Error('User not associated with a team');
  }

  return await db
    .update(projects)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.teamId, userWithTeam.teamId)
      )
    );
}

export async function restoreDrawing(drawingId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .update(drawings)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(drawings.id, drawingId));
}

export async function restoreSimulation(simulationId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .update(simulations)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(simulations.id, simulationId),
        eq(simulations.userId, user.id)
      )
    );
}

export async function restoreReport(reportId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .update(reports)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reports.id, reportId),
        eq(reports.userId, user.id)
      )
    );
}
