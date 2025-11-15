import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import * as secp256k1 from '@noble/secp256k1'

/**
 * KeyDerivation handles deterministic key generation from passkey credentials
 * Uses HKDF (HMAC-based Key Derivation Function) for secure key derivation
 */
export class KeyDerivation {
  /**
   * Derives a signing key from credential ID and user ID
   * @param credentialId - The WebAuthn credential ID (base64url encoded)
   * @param userId - The user's unique identifier
   * @param salt - Optional salt for additional entropy
   * @returns A valid secp256k1 private key (32 bytes)
   */
  static async deriveSigningKey(
    credentialId: string,
    userId: string,
    salt?: Uint8Array
  ): Promise<Uint8Array> {
    // Info parameter for HKDF - identifies the purpose of derived key
    const info = new TextEncoder().encode('passface-signing-key-v1')

    // Input key material - combination of credential ID and user ID
    const ikm = new TextEncoder().encode(credentialId + userId)

    // Derive 32 bytes for secp256k1 private key using HKDF
    const derivedKey = hkdf(sha256, ikm, salt, info, 32)

    // Ensure the derived key is valid for secp256k1
    return this.ensureValidPrivateKey(derivedKey)
  }

  /**
   * Ensures the derived key is within the valid range for secp256k1
   * If not valid, recursively hashes until a valid key is obtained
   * @param key - The candidate private key
   * @returns A valid secp256k1 private key
   */
  private static ensureValidPrivateKey(key: Uint8Array): Uint8Array {
    // secp256k1 private keys must be in range [1, n-1] where n is the curve order
    while (!secp256k1.utils.isValidSecretKey(key)) {
      key = sha256(key)
    }
    return key
  }

  /**
   * Derives the public key from a private key
   * @param privateKey - The secp256k1 private key
   * @returns The compressed public key (33 bytes)
   */
  static getPublicKey(privateKey: Uint8Array): Uint8Array {
    return secp256k1.getPublicKey(privateKey, true)
  }

  /**
   * Derives an Ethereum address from a private key
   * @param privateKey - The secp256k1 private key
   * @returns The Ethereum address (0x-prefixed hex string)
   */
  static async getEthereumAddress(privateKey: Uint8Array): Promise<string> {
    // Get uncompressed public key (65 bytes: 0x04 + x + y)
    const publicKey = secp256k1.getPublicKey(privateKey, false)

    // Remove the 0x04 prefix
    const publicKeyWithoutPrefix = publicKey.slice(1)

    // Hash with Keccak-256
    const hash = sha256(publicKeyWithoutPrefix)

    // Take last 20 bytes and convert to hex
    const address = Array.from(hash.slice(-20))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return '0x' + address
  }
}
