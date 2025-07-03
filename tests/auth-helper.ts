/**
 * Test Authentication Helper
 * 
 * Provides utilities for creating session cookies for test purposes
 */

import { signToken } from '@/lib/auth/session'

export async function createTestSessionCookie(userId: number): Promise<string> {
  const sessionData = {
    user: { id: userId },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
  
  const token = await signToken(sessionData)
  return `session=${token}`
}
