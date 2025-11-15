import { PasskeyAuth } from '@/components/PasskeyAuth'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Passface</h1>
          <p className="text-xl text-gray-600 mb-2">
            Deterministic Message Signing with WebAuthn Passkeys
          </p>
          <p className="text-sm text-gray-500">
            Secure, passwordless authentication with cryptographic message
            signing
          </p>
        </div>

        <PasskeyAuth />

        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                1. Register with Passkey
              </h3>
              <p>
                Create a secure passkey using your device&apos;s biometric
                authentication (fingerprint, Face ID, etc.)
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                2. Derive Signing Key
              </h3>
              <p>
                A deterministic signing key is derived from your passkey
                credentials using HKDF
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">3. Sign Messages</h3>
              <p>
                Sign arbitrary messages using RFC 6979 deterministic ECDSA,
                compatible with ethers.js
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">
                4. Consistent Signatures
              </h3>
              <p>
                Same message always produces the same signature, even across
                different sessions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
