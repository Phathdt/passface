import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/db/prisma'
import { webAuthnConfig } from '@/lib/auth/webauthn-config'

/**
 * POST /api/authenticate/verify
 * Verifies the WebAuthn authentication response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const credential = body.credential as AuthenticationResponseJSON

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential is required' },
        { status: 400 }
      )
    }

    // Get the challenge from cookie
    const challenge = request.cookies.get('auth-challenge')?.value

    if (!challenge) {
      return NextResponse.json(
        { error: 'Authentication session expired' },
        { status: 400 }
      )
    }

    // Find the credential in the database
    const credentialIdBase64 = Buffer.from(
      credential.rawId,
      'base64url'
    ).toString('base64url')

    const storedCredential = await prisma.credential.findUnique({
      where: { credentialId: credentialIdBase64 },
      include: { user: true },
    })

    if (!storedCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      )
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: webAuthnConfig.origin,
      expectedRPID: webAuthnConfig.rpID,
      credential: {
        id: storedCredential.credentialId,
        publicKey: Buffer.from(storedCredential.publicKey, 'base64url'),
        counter: storedCredential.signCount,
        transports: storedCredential.transports
          .split(',')
          .filter(Boolean) as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return NextResponse.json(
        { error: 'Verification failed', success: false },
        { status: 400 }
      )
    }

    // Update the sign count
    await prisma.credential.update({
      where: { id: storedCredential.id },
      data: { signCount: verification.authenticationInfo.newCounter },
    })

    // Clear the auth challenge cookie
    const response = NextResponse.json({
      success: true,
      verified: true,
      user: {
        id: storedCredential.user.id,
        username: storedCredential.user.username,
      },
      credential: {
        id: storedCredential.id,
        credentialId: credentialIdBase64,
      },
    })

    response.cookies.delete('auth-challenge')
    response.cookies.delete('auth-username')

    // Set authenticated session cookies
    response.cookies.set('user-id', storedCredential.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    response.cookies.set('credential-id', credentialIdBase64, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication', success: false },
      { status: 500 }
    )
  }
}
