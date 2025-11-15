import { NextResponse } from 'next/server'

/**
 * POST /api/logout
 * Clears session cookies and logs out the user
 */
export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear all session cookies
  response.cookies.delete('user-id')
  response.cookies.delete('credential-id')
  response.cookies.delete('auth-challenge')
  response.cookies.delete('auth-username')
  response.cookies.delete('registration-challenge')
  response.cookies.delete('registration-username')

  return response
}
