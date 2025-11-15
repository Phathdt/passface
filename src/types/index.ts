/**
 * Type definitions for the Passface application
 */

export interface User {
  id: string
  username: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Credential {
  id: string
  credentialId: string
  publicKey?: string
  signCount?: number
  transports?: string
  userId?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface SigningKeyMetadata {
  userId: string
  credentialId: string
}

export interface EncryptedKeyData {
  encryptedKey: string
  iv: string
  salt: string
  timestamp: number
  metadata?: SigningKeyMetadata
}

export interface AuthResponse {
  success: boolean
  verified: boolean
  user: User
  credential: Credential
}

export interface ApiError {
  error: string
  success: false
}
