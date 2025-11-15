import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

/**
 * Encryption utilities for secure key storage in IndexedDB
 * Uses AES-GCM for authenticated encryption
 */
export class Encryption {
  /**
   * Encrypts data using AES-GCM
   *
   * @param data - The data to encrypt
   * @param password - The password/passphrase for encryption
   * @returns Object containing encrypted data, IV, and salt
   */
  static async encrypt(
    data: Uint8Array,
    password: string
  ): Promise<{
    encryptedData: Uint8Array
    iv: Uint8Array
    salt: Uint8Array
  }> {
    // Ensure data is standard Uint8Array
    const dataStandard = new Uint8Array(data)

    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Derive encryption key from password using HKDF
    const passwordBytes = new TextEncoder().encode(password)
    const info = new TextEncoder().encode('passface-encryption-key-v1')
    const derivedKey = hkdf(sha256, passwordBytes, salt, info, 32)

    // Convert to standard Uint8Array for Web Crypto API compatibility
    const derivedKeyStandard = new Uint8Array(derivedKey)

    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedKeyStandard,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      dataStandard
    )

    return {
      encryptedData: new Uint8Array(encryptedBuffer),
      iv,
      salt,
    }
  }

  /**
   * Decrypts data that was encrypted with AES-GCM
   *
   * @param encryptedData - The encrypted data
   * @param iv - The initialization vector used during encryption
   * @param salt - The salt used for key derivation
   * @param password - The password/passphrase for decryption
   * @returns The decrypted data
   */
  static async decrypt(
    encryptedData: Uint8Array,
    iv: Uint8Array,
    salt: Uint8Array,
    password: string
  ): Promise<Uint8Array> {
    // Ensure all inputs are standard Uint8Arrays
    const encryptedDataStandard = new Uint8Array(encryptedData)
    const ivStandard = new Uint8Array(iv)
    const saltStandard = new Uint8Array(salt)
    // Derive the same encryption key from password
    const passwordBytes = new TextEncoder().encode(password)
    const info = new TextEncoder().encode('passface-encryption-key-v1')
    const derivedKey = hkdf(sha256, passwordBytes, saltStandard, info, 32)

    // Convert to standard Uint8Array for Web Crypto API compatibility
    const derivedKeyStandard = new Uint8Array(derivedKey)

    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      derivedKeyStandard,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivStandard,
      },
      cryptoKey,
      encryptedDataStandard
    )

    return new Uint8Array(decryptedBuffer)
  }

  /**
   * Generates a secure random password/passphrase
   * Can be used as an encryption key
   *
   * @param length - The length of the password in bytes (default: 32)
   * @returns A base64-encoded random password
   */
  static generatePassword(length: number = 32): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length))
    return this.bytesToBase64(randomBytes)
  }

  /**
   * Converts bytes to base64 string
   */
  static bytesToBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
  }

  /**
   * Converts base64 string to bytes
   */
  static base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }
}
