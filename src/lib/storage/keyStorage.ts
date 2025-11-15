import { openDB, type IDBPDatabase } from 'idb'
import { Encryption } from '../crypto/encryption'

/**
 * Signing key record type
 */
interface SigningKeyRecord {
  id: string
  encryptedKey: string
  iv: string
  salt: string
  timestamp: number
  metadata?: {
    userId: string
    credentialId: string
  }
}

/**
 * Session data record type
 */
interface SessionDataRecord {
  id: string
  data: string
  timestamp: number
  expiresAt?: number
}

/**
 * KeyStorage manages secure storage of derived signing keys in IndexedDB
 * Keys are encrypted using AES-GCM before storage
 */
export class KeyStorage {
  private static DB_NAME = 'passface-keys'
  private static DB_VERSION = 1
  private static SIGNING_KEYS_STORE = 'signing-keys'
  private static SESSION_DATA_STORE = 'session-data'

  /**
   * Opens or creates the IndexedDB database
   */
  private static async getDB(): Promise<IDBPDatabase> {
    return openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create signing keys store if it doesn't exist
        if (!db.objectStoreNames.contains('signing-keys')) {
          const signingStore = db.createObjectStore('signing-keys', {
            keyPath: 'id',
          })
          signingStore.createIndex('timestamp', 'timestamp')
        }

        // Create session data store if it doesn't exist
        if (!db.objectStoreNames.contains('session-data')) {
          const sessionStore = db.createObjectStore('session-data', {
            keyPath: 'id',
          })
          sessionStore.createIndex('timestamp', 'timestamp')
          sessionStore.createIndex('expiresAt', 'expiresAt')
        }
      },
    })
  }

  /**
   * Stores an encrypted signing key in IndexedDB
   *
   * @param credentialId - The credential ID (used as storage key)
   * @param privateKey - The private key to store
   * @param password - Password for encrypting the key
   * @param metadata - Optional metadata (userId, etc.)
   */
  static async storeKey(
    credentialId: string,
    privateKey: Uint8Array,
    password: string,
    metadata?: { userId: string; credentialId: string }
  ): Promise<void> {
    try {
      // Encrypt the private key
      const { encryptedData, iv, salt } = await Encryption.encrypt(
        privateKey,
        password
      )

      // Convert to base64 for storage
      const record = {
        id: credentialId,
        encryptedKey: Encryption.bytesToBase64(encryptedData),
        iv: Encryption.bytesToBase64(iv),
        salt: Encryption.bytesToBase64(salt),
        timestamp: Date.now(),
        metadata,
      }

      // Store in IndexedDB
      const db = await this.getDB()
      await db.put('signing-keys', record)
    } catch (error) {
      console.error('Failed to store key:', error)
      throw new Error('Failed to store signing key')
    }
  }

  /**
   * Retrieves and decrypts a signing key from IndexedDB
   *
   * @param credentialId - The credential ID
   * @param password - Password for decrypting the key
   * @returns The decrypted private key, or null if not found
   */
  static async retrieveKey(
    credentialId: string,
    password: string
  ): Promise<Uint8Array | null> {
    try {
      const db = await this.getDB()
      const record = (await db.get('signing-keys', credentialId)) as
        | SigningKeyRecord
        | undefined

      if (!record) {
        return null
      }

      // Convert from base64
      const encryptedData = Encryption.base64ToBytes(record.encryptedKey)
      const iv = Encryption.base64ToBytes(record.iv)
      const salt = Encryption.base64ToBytes(record.salt)

      // Decrypt the private key
      const privateKey = await Encryption.decrypt(
        encryptedData,
        iv,
        salt,
        password
      )

      return privateKey
    } catch (error) {
      console.error('Failed to retrieve key:', error)
      return null
    }
  }

  /**
   * Checks if a key exists for the given credential ID
   */
  static async hasKey(credentialId: string): Promise<boolean> {
    try {
      const db = await this.getDB()
      const record = (await db.get('signing-keys', credentialId)) as
        | SigningKeyRecord
        | undefined
      return record !== undefined
    } catch (error) {
      console.error('Failed to check key existence:', error)
      return false
    }
  }

  /**
   * Deletes a stored key
   */
  static async deleteKey(credentialId: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete('signing-keys', credentialId)
    } catch (error) {
      console.error('Failed to delete key:', error)
      throw new Error('Failed to delete signing key')
    }
  }

  /**
   * Clears all stored keys
   */
  static async clearAllKeys(): Promise<void> {
    try {
      const db = await this.getDB()
      await db.clear('signing-keys')
    } catch (error) {
      console.error('Failed to clear keys:', error)
      throw new Error('Failed to clear all signing keys')
    }
  }

  /**
   * Stores session data in IndexedDB
   *
   * @param key - The session key
   * @param data - The data to store (will be serialized)
   * @param expiresIn - Optional expiration time in milliseconds
   */
  static async storeSessionData(
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    expiresIn?: number
  ): Promise<void> {
    try {
      const record = {
        id: key,
        data: JSON.stringify(data),
        timestamp: Date.now(),
        expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      }

      const db = await this.getDB()
      await db.put('session-data', record)
    } catch (error) {
      console.error('Failed to store session data:', error)
      throw new Error('Failed to store session data')
    }
  }

  /**
   * Retrieves session data from IndexedDB
   *
   * @param key - The session key
   * @returns The stored data, or null if not found or expired
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getSessionData(key: string): Promise<any | null> {
    try {
      const db = await this.getDB()
      const record = (await db.get('session-data', key)) as
        | SessionDataRecord
        | undefined

      if (!record) {
        return null
      }

      // Check if expired
      if (record.expiresAt && record.expiresAt < Date.now()) {
        await db.delete('session-data', key)
        return null
      }

      return JSON.parse(record.data)
    } catch (error) {
      console.error('Failed to retrieve session data:', error)
      return null
    }
  }

  /**
   * Deletes session data
   */
  static async deleteSessionData(key: string): Promise<void> {
    try {
      const db = await this.getDB()
      await db.delete('session-data', key)
    } catch (error) {
      console.error('Failed to delete session data:', error)
    }
  }

  /**
   * Clears all session data
   */
  static async clearAllSessionData(): Promise<void> {
    try {
      const db = await this.getDB()
      await db.clear('session-data')
    } catch (error) {
      console.error('Failed to clear session data:', error)
    }
  }

  /**
   * Cleans up expired session data
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const db = await this.getDB()
      const tx = db.transaction('session-data', 'readwrite')
      const index = tx.store.index('expiresAt')
      const now = Date.now()

      let cursor = await index.openCursor()
      while (cursor) {
        if (cursor.value.expiresAt && cursor.value.expiresAt < now) {
          await cursor.delete()
        }
        cursor = await cursor.continue()
      }

      await tx.done
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error)
    }
  }
}
