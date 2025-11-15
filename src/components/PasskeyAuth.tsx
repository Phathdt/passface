'use client'

import { useState } from 'react'
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { KeyDerivation } from '@/lib/crypto/keyDerivation'
import { MessageSigner } from '@/lib/crypto/signing'
import { KeyStorage } from '@/lib/storage/keyStorage'
import { Encryption } from '@/lib/crypto/encryption'

interface User {
  id: string
  username: string
}

interface Credential {
  id: string
  credentialId: string
}

interface PasskeyAuthProps {
  onAuthSuccess?: (user: User) => void
  onLogout?: () => void
}

/**
 * PasskeyAuth Component
 * Handles WebAuthn passkey registration, authentication, and message signing
 */
export function PasskeyAuth({ onAuthSuccess, onLogout }: PasskeyAuthProps) {
  const [user, setUser] = useState<User | null>(null)
  const [credential, setCredential] = useState<Credential | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Registration state
  const [username, setUsername] = useState('')

  // Signing state
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState('')
  const [signingKey, setSigningKey] = useState<Uint8Array | null>(null)

  /**
   * Handle user registration with passkey
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (!username.trim()) {
        throw new Error('Username is required')
      }

      // Get registration options from server
      const optionsRes = await fetch('/api/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })

      if (!optionsRes.ok) {
        const error = await optionsRes.json()
        throw new Error(error.error || 'Failed to get registration options')
      }

      const options = await optionsRes.json()

      // Start WebAuthn registration
      const registrationResponse = await startRegistration(options)

      // Verify with server
      const verifyRes = await fetch('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: registrationResponse }),
      })

      if (!verifyRes.ok) {
        const error = await verifyRes.json()
        throw new Error(error.error || 'Registration verification failed')
      }

      const result = await verifyRes.json()

      if (!result.success) {
        throw new Error('Registration verification failed')
      }

      // Derive and store signing key
      await deriveAndStoreKey(result.credential.credentialId, result.user.id)

      // Update state
      setUser(result.user)
      setCredential(result.credential)
      setSuccess('Registration successful! You can now sign messages.')
      setUsername('')

      if (onAuthSuccess) {
        onAuthSuccess(result.user)
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle user authentication with passkey
   */
  const handleAuthenticate = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Get authentication options from server
      const optionsRes = await fetch('/api/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!optionsRes.ok) {
        const error = await optionsRes.json()
        throw new Error(error.error || 'Failed to get authentication options')
      }

      const options = await optionsRes.json()

      // Start WebAuthn authentication
      const authResponse = await startAuthentication(options)

      // Verify with server
      const verifyRes = await fetch('/api/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: authResponse }),
      })

      if (!verifyRes.ok) {
        const error = await verifyRes.json()
        throw new Error(error.error || 'Authentication verification failed')
      }

      const result = await verifyRes.json()

      if (!result.success) {
        throw new Error('Authentication verification failed')
      }

      // Load signing key from storage
      await loadSigningKey(result.credential.credentialId, result.user.id)

      // Update state
      setUser(result.user)
      setCredential(result.credential)
      setSuccess('Authentication successful! You can now sign messages.')

      if (onAuthSuccess) {
        onAuthSuccess(result.user)
      }
    } catch (err) {
      console.error('Authentication error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Derives signing key and stores it encrypted in IndexedDB
   */
  const deriveAndStoreKey = async (credentialId: string, userId: string) => {
    try {
      // Derive signing key from credential ID and user ID
      const privateKey = await KeyDerivation.deriveSigningKey(
        credentialId,
        userId
      )

      // Generate encryption password
      const encryptionPassword = Encryption.generatePassword()

      // Store encrypted key in IndexedDB
      await KeyStorage.storeKey(credentialId, privateKey, encryptionPassword, {
        userId,
        credentialId,
      })

      // Store encryption password in session storage (temporary)
      // In production, consider more secure storage options
      sessionStorage.setItem(`key-password-${credentialId}`, encryptionPassword)

      // Set signing key in state
      setSigningKey(privateKey)
    } catch (err) {
      console.error('Error deriving and storing key:', err)
      throw new Error('Failed to derive signing key')
    }
  }

  /**
   * Loads signing key from IndexedDB
   */
  const loadSigningKey = async (credentialId: string, userId: string) => {
    try {
      // Get encryption password from session storage
      const encryptionPassword = sessionStorage.getItem(
        `key-password-${credentialId}`
      )

      if (!encryptionPassword) {
        // If password not in session, re-derive the key
        await deriveAndStoreKey(credentialId, userId)
        return
      }

      // Retrieve and decrypt key from IndexedDB
      const privateKey = await KeyStorage.retrieveKey(
        credentialId,
        encryptionPassword
      )

      if (!privateKey) {
        // If key not found, re-derive it
        await deriveAndStoreKey(credentialId, userId)
        return
      }

      setSigningKey(privateKey)
    } catch (err) {
      console.error('Error loading signing key:', err)
      throw new Error('Failed to load signing key')
    }
  }

  /**
   * Signs a message using the derived signing key
   */
  const handleSignMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      if (!message.trim()) {
        throw new Error('Message is required')
      }

      if (!signingKey) {
        throw new Error('No signing key available. Please authenticate first.')
      }

      // Sign the message
      const sig = await MessageSigner.signMessage(message, signingKey)

      setSignature(sig)
      setSuccess('Message signed successfully!')
    } catch (err) {
      console.error('Signing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign message')
    }
  }

  /**
   * Handle logout
   */
  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/logout', { method: 'POST' })

      // Clear session storage
      if (credential) {
        sessionStorage.removeItem(`key-password-${credential.credentialId}`)
      }

      // Clear state
      setUser(null)
      setCredential(null)
      setSigningKey(null)
      setSignature('')
      setMessage('')
      setSuccess('Logged out successfully')

      if (onLogout) {
        onLogout()
      }
    } catch (err) {
      console.error('Logout error:', err)
      setError('Failed to logout')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Authentication Section */}
      {!user ? (
        <div className="space-y-6">
          {/* Registration Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Register with Passkey</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>
          </div>

          {/* Authentication Button */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Sign In with Passkey</h2>
            <button
              onClick={handleAuthenticate}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">
              Welcome, {user.username}!
            </h2>
            <p className="text-gray-600 mb-4">User ID: {user.id}</p>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          {/* Message Signing Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Sign Message</h2>
            <form onSubmit={handleSignMessage} className="space-y-4">
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter message to sign"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Sign Message
              </button>
            </form>

            {signature && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">
                  Signature
                </label>
                <div className="bg-gray-50 p-4 rounded font-mono text-sm break-all">
                  {signature}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(signature)}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
