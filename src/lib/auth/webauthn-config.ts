/**
 * WebAuthn configuration for the application
 */

// Get the RP ID based on the environment
export const RP_NAME = 'Passface'

export const getRelyingPartyId = (): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use the current hostname
    return window.location.hostname
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_RP_ID || 'localhost'
}

export const getOrigin = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000'
}

/**
 * WebAuthn configuration options
 */
export const webAuthnConfig = {
  rpName: RP_NAME,
  rpID: getRelyingPartyId(),
  origin: getOrigin(),
  // Timeout for WebAuthn operations (60 seconds)
  timeout: 60000,
  // Attestation preference
  attestationType: 'none' as const,
  // Authenticator selection criteria
  authenticatorSelection: {
    residentKey: 'preferred' as const,
    userVerification: 'preferred' as const,
    requireResidentKey: false,
  },
}
