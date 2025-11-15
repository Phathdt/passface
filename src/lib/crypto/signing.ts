import * as secp256k1 from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha2.js'

/**
 * MessageSigner provides deterministic ECDSA signature generation
 * compatible with ethers.js and Ethereum standards (EIP-191)
 */
export class MessageSigner {
  /**
   * Signs a message using EIP-191 personal sign format
   * Produces deterministic signatures using RFC 6979
   *
   * @param message - The message to sign (string or bytes)
   * @param privateKey - The secp256k1 private key
   * @returns A 65-byte signature in ethers.js format (0x + r + s + v)
   */
  static async signMessage(
    message: string | Uint8Array,
    privateKey: Uint8Array
  ): Promise<string> {
    // Convert message to bytes if needed
    const messageBytes =
      typeof message === 'string' ? new TextEncoder().encode(message) : message

    // Apply EIP-191 message prefixing
    const prefixedMessage = this.prefixMessage(messageBytes)

    // Hash the prefixed message
    const messageHash = sha256(prefixedMessage)

    // Sign using deterministic ECDSA (RFC 6979)
    // Use 'recovered' format to get signature with recovery bit
    const signatureBytes = await secp256k1.signAsync(messageHash, privateKey, {
      prehash: false,
      format: 'recovered',
    })

    // Convert bytes to Signature object (recovered format includes recovery bit)
    const signature = secp256k1.Signature.fromBytes(signatureBytes, 'recovered')

    // Format for ethers.js compatibility
    return this.formatSignature(signature)
  }

  /**
   * Applies EIP-191 personal sign message prefix
   * Format: "\x19Ethereum Signed Message:\n" + message.length + message
   *
   * @param message - The message bytes
   * @returns The prefixed message bytes
   */
  private static prefixMessage(message: Uint8Array): Uint8Array {
    const prefix = '\x19Ethereum Signed Message:\n'
    const prefixBytes = new TextEncoder().encode(prefix)
    const lengthBytes = new TextEncoder().encode(message.length.toString())

    // Concatenate: prefix + length + message
    const result = new Uint8Array(
      prefixBytes.length + lengthBytes.length + message.length
    )
    result.set(prefixBytes, 0)
    result.set(lengthBytes, prefixBytes.length)
    result.set(message, prefixBytes.length + lengthBytes.length)

    return result
  }

  /**
   * Formats signature to ethers.js compatible format
   * Output: 0x + r (32 bytes) + s (32 bytes) + v (1 byte)
   *
   * @param sig - The secp256k1 signature (with recovery bit)
   * @returns 65-byte hex string (0x-prefixed)
   */
  private static formatSignature(sig: secp256k1.Signature): string {
    // Convert r and s to hex strings (64 characters each)
    const r = sig.r.toString(16).padStart(64, '0')
    const s = sig.s.toString(16).padStart(64, '0')

    // Recovery parameter (v) - add 27 for Ethereum compatibility
    const v = (sig.recovery !== undefined ? sig.recovery : 0) + 27
    const vHex = v.toString(16).padStart(2, '0')

    return '0x' + r + s + vHex
  }

  /**
   * Verifies a signature against a message and public key
   *
   * @param message - The original message
   * @param signature - The signature to verify (ethers.js format)
   * @param publicKey - The public key to verify against
   * @returns true if signature is valid
   */
  static async verifySignature(
    message: string | Uint8Array,
    signature: string,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      // Convert message to bytes if needed
      const messageBytes =
        typeof message === 'string'
          ? new TextEncoder().encode(message)
          : message

      // Apply EIP-191 prefix
      const prefixedMessage = this.prefixMessage(messageBytes)
      const messageHash = sha256(prefixedMessage)

      // Parse ethers.js signature format (0x + r + s + v)
      const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
      const r = BigInt('0x' + sigHex.slice(0, 64))
      const s = BigInt('0x' + sigHex.slice(64, 128))

      // Create compact signature bytes (64 bytes: r + s)
      const compactSig = new secp256k1.Signature(r, s).toBytes('compact')

      // Verify using the new API
      return await secp256k1.verifyAsync(compactSig, messageHash, publicKey, {
        prehash: false,
      })
    } catch (error) {
      console.error('Signature verification failed:', error)
      return false
    }
  }

  /**
   * Recovers the public key from a message and signature
   *
   * @param message - The original message
   * @param signature - The signature (ethers.js format)
   * @returns The recovered public key
   */
  static async recoverPublicKey(
    message: string | Uint8Array,
    signature: string
  ): Promise<Uint8Array> {
    // Convert message to bytes if needed
    const messageBytes =
      typeof message === 'string' ? new TextEncoder().encode(message) : message

    // Apply EIP-191 prefix
    const prefixedMessage = this.prefixMessage(messageBytes)
    const messageHash = sha256(prefixedMessage)

    // Parse ethers.js signature format (0x + r + s + v)
    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
    const r = BigInt('0x' + sigHex.slice(0, 64))
    const s = BigInt('0x' + sigHex.slice(64, 128))
    const v = parseInt(sigHex.slice(128, 130), 16)
    const recovery = v >= 27 ? v - 27 : v

    // Create signature with recovery bit
    const sig = new secp256k1.Signature(r, s, recovery)
    const recoveredSig = sig.toBytes('recovered')

    // Recover public key using the new API
    return await secp256k1.recoverPublicKeyAsync(recoveredSig, messageHash, {
      prehash: false,
    })
  }
}
