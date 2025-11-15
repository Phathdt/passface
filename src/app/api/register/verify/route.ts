import { NextRequest, NextResponse } from 'next/server'
import {
  verifyRegistrationResponse,
  type VerifyRegistrationResponseOpts,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/db/prisma'
import { webAuthnConfig } from '@/lib/auth/webauthn-config'

/**
 * POST /api/register/verify
 * Verifies the WebAuthn registration response and stores the credential
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const credential = body.credential as RegistrationResponseJSON

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential is required' },
        { status: 400 }
      )
    }

    // Get the challenge and username from cookies
    const challenge = request.cookies.get('registration-challenge')?.value
    const username = request.cookies.get('registration-username')?.value

    if (!challenge || !username) {
      return NextResponse.json(
        { error: 'Registration session expired' },
        { status: 400 }
      )
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: webAuthnConfig.origin,
      expectedRPID: webAuthnConfig.rpID,
      requireUserVerification: false,
    } as VerifyRegistrationResponseOpts)

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Verification failed', success: false },
        { status: 400 }
      )
    }

    const { credential: verifiedCredential } = verification.registrationInfo

    // The credential already has base64url encoded ID
    const credentialIdBase64 = verifiedCredential.id
    const publicKeyBase64 = Buffer.from(verifiedCredential.publicKey).toString(
      'base64url'
    )

    // Get transports from the original credential response
    const transports =
      verifiedCredential.transports?.join(',') ||
      credential.response.transports?.join(',') ||
      ''

    // Store the credential in the database
    // Use upsert to handle both new users and existing users adding credentials
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username },
    })

    const storedCredential = await prisma.credential.create({
      data: {
        credentialId: credentialIdBase64,
        publicKey: publicKeyBase64,
        signCount: verifiedCredential.counter,
        transports,
        userId: user.id,
      },
    })

    // Clear the registration cookies
    const response = NextResponse.json({
      success: true,
      verified: true,
      credential: {
        id: storedCredential.id,
        credentialId: credentialIdBase64,
      },
      user: {
        id: user.id,
        username: user.username,
      },
    })

    response.cookies.delete('registration-challenge')
    response.cookies.delete('registration-username')

    // Set authenticated session cookie
    response.cookies.set('user-id', user.id, {
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
    console.error('Error verifying registration:', error)
    return NextResponse.json(
      { error: 'Failed to verify registration', success: false },
      { status: 500 }
    )
  }
}
