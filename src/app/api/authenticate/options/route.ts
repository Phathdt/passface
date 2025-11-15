import { NextRequest, NextResponse } from 'next/server'
import {
  generateAuthenticationOptions,
  type GenerateAuthenticationOptionsOpts,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/db/prisma'
import { webAuthnConfig } from '@/lib/auth/webauthn-config'

/**
 * POST /api/authenticate/options
 * Generates WebAuthn authentication options
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    // Username is optional for discoverable credentials
    let allowCredentials:
      | {
          id: Buffer
          type: 'public-key'
          transports?: AuthenticatorTransport[]
        }[]
      | undefined

    if (username) {
      // If username provided, find user's credentials
      const user = await prisma.user.findUnique({
        where: { username },
        include: { credentials: true },
      })

      if (!user || user.credentials.length === 0) {
        return NextResponse.json(
          { error: 'User not found or has no credentials' },
          { status: 404 }
        )
      }

      // Include user's credentials in the options
      allowCredentials = user.credentials.map((cred) => ({
        id: Buffer.from(cred.credentialId, 'base64url'),
        type: 'public-key' as const,
        transports: cred.transports
          .split(',')
          .filter(Boolean) as AuthenticatorTransport[],
      }))
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: webAuthnConfig.rpID,
      timeout: webAuthnConfig.timeout,
      allowCredentials,
      userVerification: 'preferred',
    } as GenerateAuthenticationOptionsOpts)

    // Store the challenge in a cookie for verification
    const response = NextResponse.json(options)
    response.cookies.set('auth-challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    })

    if (username) {
      response.cookies.set('auth-username', username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutes
      })
    }

    return response
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
