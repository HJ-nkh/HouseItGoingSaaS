/**
 * Test Setup Utilities
 * 
 * Utilities for setting up test data and authentication for integration tests.
 */

import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, type NewUser } from '@/lib/db/schema';
import { hashPassword, setSession } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

export interface TestUser {
  id: number;
  email: string;
  teamId: number;
  userData: NewUser;
}

/**
 * Creates a test user and team for testing purposes
 */
export async function createTestUser(): Promise<TestUser> {
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';
  
  try {
    // Check if test user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    let userId: number;
    let teamId: number;
    let userData: NewUser;

    if (existingUser.length > 0) {
      // Use existing user
      userId = existingUser[0].id;
      userData = existingUser[0];
      
      // Get user's team
      const userTeam = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);
      
      if (userTeam.length > 0) {
        teamId = userTeam[0].teamId;
      } else {
        // Create team for existing user
        const [newTeam] = await db
          .insert(teams)
          .values({
            name: 'Test Team',
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            stripeProductId: null,
            planName: null,
            subscriptionStatus: 'inactive'
          })
          .returning();
        
        teamId = newTeam.id;
        
        // Add user to team
        await db.insert(teamMembers).values({
          teamId,
          userId,
          role: 'owner'
        });
      }
    } else {
      // Create new user
      const passwordHash = await hashPassword(testPassword);
      
      const [newUser] = await db
        .insert(users)
        .values({
          email: testEmail,
          passwordHash,
          role: 'owner'
        })
        .returning();
      
      userId = newUser.id;
      userData = newUser;
      
      // Create team
      const [newTeam] = await db
        .insert(teams)
        .values({
          name: 'Test Team',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeProductId: null,
          planName: null,
          subscriptionStatus: 'inactive'
        })
        .returning();
      
      teamId = newTeam.id;
      
      // Add user to team
      await db.insert(teamMembers).values({
        teamId,
        userId,
        role: 'owner'
      });
    }

    return {
      id: userId,
      email: testEmail,
      teamId,
      userData
    };
    
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

/**
 * Cleans up test data
 */
export async function cleanupTestUser(userId: number) {
  try {
    // Get user's team
    const userTeam = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1);
    
    if (userTeam.length > 0) {
      const teamId = userTeam[0].teamId;
      
      // Remove user from team
      await db
        .delete(teamMembers)
        .where(eq(teamMembers.userId, userId));
      
      // Check if team has other members
      const remainingMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.teamId, teamId));
      
      // If no other members, delete team
      if (remainingMembers.length === 0) {
        await db
          .delete(teams)
          .where(eq(teams.id, teamId));
      }
    }
    
    // Note: We might want to keep the test user for future test runs
    // await db.delete(users).where(eq(users.id, userId));
    
  } catch (error) {
    console.error('Error cleaning up test user:', error);
  }
}
