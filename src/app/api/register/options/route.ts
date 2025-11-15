import { NextRequest, NextResponse } from 'next/server'
import {
  generateRegistrationOptions,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/db/prisma'
import { webAuthnConfig } from '@/lib/auth/webauthn-config'

/**
 * POST /api/register/options
 * Generates WebAuthn registration options for a new user
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
      include: { credentials: true },
    })

    // If user exists, include their existing credentials to prevent duplicates
    const excludeCredentials =
      existingUser?.credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          .split(',')
          .filter(Boolean) as AuthenticatorTransportFuture[],
      })) || []

    // Generate a user ID (use existing or create new)
    const userId = existingUser?.id || crypto.randomUUID()

    // Convert user ID to Uint8Array for WebAuthn
    const userIdBytes = new TextEncoder().encode(userId)

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: webAuthnConfig.rpName,
      rpID: webAuthnConfig.rpID,
      userName: username,
      userID: userIdBytes,
      timeout: webAuthnConfig.timeout,
      attestationType: webAuthnConfig.attestationType,
      excludeCredentials,
      authenticatorSelection: webAuthnConfig.authenticatorSelection,
    })

    // Store the challenge in a cookie for verification
    // In production, use a secure session store
    const response = NextResponse.json(options)
    response.cookies.set('registration-challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    })

    // Store username for verification
    response.cookies.set('registration-username', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    })

    return response
  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
