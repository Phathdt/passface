# Cross-Device Passkey Signing: Desktop to iPhone

## Your Question

> "If I create account in desktop and store in iCloud, then move to iPhone with same iCloud, could I login and sign the same?"

**Answer: YES** - You'll get the exact same signatures on both devices when using iCloud Keychain syncing.

## How It Works

### Step-by-Step Flow

```
Registration on Desktop (macOS)
────────────────────────────────────────────────────────────
1. User registers on Safari/Chrome (macOS)
2. WebAuthn creates passkey
   - credentialId: "V3QxMjM0NTY3ODkwYWJjZGVm" (example)
   - Private key stored in Secure Enclave
   - Public key sent to server

3. Our app derives signing key:
   privateKey = HKDF(
     ikm: "V3QxMjM0NTY3ODkwYWJjZGVm" + "user-123",
     info: "passface-signing-key-v1"
   )
   Result: 0x7f8e9d6c5b4a39281716f5e4d3c2b1a0... (32 bytes)

4. Sign a message:
   signature = ECDSA_sign("Hello World", privateKey)
   Result: 0x1a2b3c4d5e6f... (65 bytes)

5. Passkey syncs to iCloud Keychain ☁️


Login on iPhone (iOS)
────────────────────────────────────────────────────────────
1. User navigates to same website on Safari (iOS)
2. WebAuthn detects synced passkey from iCloud
3. User authenticates with Face ID / Touch ID
4. Same credentialId retrieved: "V3QxMjM0NTY3ODkwYWJjZGVm"

5. Our app derives signing key:
   privateKey = HKDF(
     ikm: "V3QxMjM0NTY3ODkwYWJjZGVm" + "user-123",
     info: "passface-signing-key-v1"
   )
   Result: 0x7f8e9d6c5b4a39281716f5e4d3c2b1a0... (SAME!)

6. Sign the same message:
   signature = ECDSA_sign("Hello World", privateKey)
   Result: 0x1a2b3c4d5e6f... (SAME SIGNATURE!)
```

## Key Technical Points

### 1. Credential ID is Synced

The **credentialId** is the critical piece that syncs via iCloud Keychain:

```javascript
// This is what iCloud syncs:
{
  rpId: "localhost",  // or "yourdomain.com"
  credentialId: "V3QxMjM0NTY3ODkwYWJjZGVm",  // Base64url encoded
  privateKey: <encrypted_in_secure_enclave>,
  publicKey: <compressed_secp256r1_point>,
  userId: "user-123",
  username: "john@example.com"
}
```

### 2. Deterministic Key Derivation

Because we use **HKDF (deterministic key derivation)**:

```
Input:
  - credentialId: "V3QxMjM0..." (synced from iCloud)
  - userId: "user-123" (from your account)
  - info: "passface-signing-key-v1" (constant)

Output:
  - privateKey: Always the same 32-byte value

This means:
  Desktop privateKey === iPhone privateKey
```

### 3. RFC 6979 Deterministic Signatures

Because we use **RFC 6979 (deterministic ECDSA)**:

```
Input:
  - message: "Hello World"
  - privateKey: 0x7f8e9d... (same on both devices)

Output:
  - signature: Always the same 65-byte value

This means:
  Desktop signature === iPhone signature
```

## Browser & Platform Support

### ✅ Works With iCloud Keychain (Apple Ecosystem)

| Device     | Browser | Passkey Sync           | Same Signature? |
| ---------- | ------- | ---------------------- | --------------- |
| macOS      | Safari  | ✅ iCloud              | ✅ YES          |
| macOS      | Chrome  | ✅ iCloud (if enabled) | ✅ YES          |
| iOS/iPadOS | Safari  | ✅ iCloud              | ✅ YES          |
| iOS/iPadOS | Chrome  | ✅ iCloud              | ✅ YES          |

### ✅ Works With Google Password Manager (Google Ecosystem)

| Device  | Browser | Passkey Sync | Same Signature? |
| ------- | ------- | ------------ | --------------- |
| macOS   | Chrome  | ✅ Google    | ✅ YES          |
| Windows | Chrome  | ✅ Google    | ✅ YES          |
| Android | Chrome  | ✅ Google    | ✅ YES          |
| Linux   | Chrome  | ✅ Google    | ✅ YES          |

### ⚠️ Cross-Platform Limitations

| From             | To      | Passkey Sync | Same Signature? |
| ---------------- | ------- | ------------ | --------------- |
| macOS (iCloud)   | Android | ❌ NO        | ❌ NO           |
| Windows (Google) | iPhone  | ❌ NO        | ❌ NO           |
| iPhone           | Windows | ❌ NO        | ❌ NO           |

## Important Considerations

### 1. RP ID Must Match

The passkey is bound to the **RP ID (Relying Party ID)**:

```javascript
// Registration on Desktop
rpId: 'localhost' // Development
// or
rpId: 'yourdomain.com' // Production

// Login on iPhone
// Must use SAME rpId, or passkey won't be recognized!
```

**Important:**

- ✅ `localhost` works for development on both devices
- ✅ `yourdomain.com` works in production
- ❌ Don't mix `localhost` and `127.0.0.1`
- ❌ Don't change domain name after registration

### 2. User Verification Required on Each Device

Even though the passkey is synced, **biometric auth is required on each device**:

```
Desktop (macOS):
  Touch ID or Apple Watch ✅

iPhone (iOS):
  Face ID or Touch ID ✅
```

This is a security feature - you can't use the passkey without biometric verification.

### 3. Same User Account Required

The `userId` must be the same:

```javascript
// Our key derivation includes userId:
privateKey = HKDF(credentialId + userId)

// If userId changes, private key changes!
// Desktop: userId = "user-123" → privateKey = 0xabcd...
// iPhone:  userId = "user-456" → privateKey = 0x1234... (DIFFERENT!)
```

**Best Practice:** Tie userId to something stable like email or UUID.

### 4. Storage Considerations

```javascript
// IndexedDB storage is LOCAL to each device
// The encrypted signing key is NOT synced

// This means:
// 1. Desktop generates & stores encrypted key locally
// 2. iPhone must RE-DERIVE the same key (which it can, because credentialId synced)
// 3. iPhone stores its own encrypted copy locally

// Implementation in PasskeyAuth.tsx handles this automatically
```

## Testing Cross-Device Signatures

Here's how to verify it works:

### Test Script

```javascript
// On Desktop:
console.log('=== Desktop Test ===')
await register('john@example.com')
const sig1 = await signMessage('Test message')
console.log('Desktop Signature:', sig1)
console.log('Desktop CredentialId:', credentialId)

// Wait for iCloud sync (usually < 30 seconds)

// On iPhone (same iCloud account):
console.log('=== iPhone Test ===')
await authenticate() // Uses synced passkey
const sig2 = await signMessage('Test message')
console.log('iPhone Signature:', sig2)
console.log('iPhone CredentialId:', credentialId)

// Verify:
console.log('Signatures match:', sig1 === sig2) // Should be TRUE
console.log('CredentialIds match:', credentialId1 === credentialId2) // Should be TRUE
```

Expected output:

```
Desktop Signature: 0x1a2b3c4d5e6f7890abcdef...
iPhone Signature:  0x1a2b3c4d5e6f7890abcdef...
Signatures match: true ✅
```

## Use Cases

### ✅ Good Use Cases

1. **Multi-Device Wallet**
   - Register on desktop
   - Sign transactions on iPhone
   - Same Ethereum address across devices

2. **Verifiable Credentials**
   - Issue credential on laptop
   - Present credential from phone
   - Same cryptographic proof

3. **Decentralized Identity**
   - Create DID on one device
   - Use on all synced devices
   - Consistent identity

### ⚠️ Be Aware

1. **Lost Device**
   - If you lose your iPhone, passkey is still in iCloud
   - Anyone with your iCloud credentials could access passkeys
   - **Mitigation:** Strong iCloud password + 2FA

2. **Backup Concerns**
   - Passkeys are backed up in iCloud
   - If Apple account is compromised, passkeys are at risk
   - **Mitigation:** Hardware security keys for high-value accounts

3. **Platform Lock-in**
   - iCloud passkeys don't work on Android
   - Google passkeys don't work on iOS
   - **Mitigation:** Support multiple credentials per user

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         iCloud                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │            Synced Passkey Data                        │ │
│  │  - credentialId: "V3Qx..."                           │ │
│  │  - rpId: "yourdomain.com"                            │ │
│  │  - userId: "user-123"                                │ │
│  │  - privateKey: <encrypted>                           │ │
│  │  - publicKey: <point>                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                    ↓                ↓                        │
│         ┌──────────────┐  ┌──────────────┐                 │
│         │   Desktop    │  │   iPhone     │                 │
│         └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
         │                  │
         ↓                  ↓
    ┌─────────┐        ┌─────────┐
    │ Derive  │        │ Derive  │
    │ Same    │        │ Same    │
    │ Private │        │ Private │
    │ Key     │        │ Key     │
    └─────────┘        └─────────┘
         │                  │
         ↓                  ↓
    ┌─────────┐        ┌─────────┐
    │ Sign    │        │ Sign    │
    │ Message │        │ Message │
    └─────────┘        └─────────┘
         │                  │
         ↓                  ↓
    Same Signature!    Same Signature!
    0x1a2b3c4d...      0x1a2b3c4d...
```

## Implementation Notes

Our current implementation at `src/components/PasskeyAuth.tsx` already handles this automatically:

```typescript
// When user authenticates on iPhone after syncing from Desktop:

1. WebAuthn retrieves synced credentialId from iCloud
2. User verifies with Face ID
3. KeyDerivation.deriveSigningKey(credentialId, userId)
   → Produces SAME private key as Desktop
4. MessageSigner.signMessage(message, privateKey)
   → Produces SAME signature as Desktop

// No special code needed - it just works! ✅
```

## Security Implications

### ✅ Positive

- **Backup**: Lose your device? Passkey is still in iCloud
- **Convenience**: Use any of your Apple devices
- **Consistency**: Same identity across all devices

### ⚠️ Negative

- **Single Point of Failure**: iCloud account = all passkeys
- **Platform Lock-in**: Tied to Apple ecosystem
- **Cloud Risk**: Passkeys stored in cloud (though encrypted)

### 🛡️ Mitigation Strategies

1. **Enable 2FA on iCloud**

   ```
   Settings → [Your Name] → Password & Security → Two-Factor Authentication
   ```

2. **Support Multiple Credentials**

   ```javascript
   // Allow user to register multiple passkeys:
   // - Desktop passkey (iCloud synced)
   // - Hardware key (device-bound, not synced)
   // - Phone passkey (separate from desktop)
   ```

3. **Add Transaction Confirmation**
   ```javascript
   // For high-value operations, require explicit confirmation:
   if (amount > 1000) {
     await showConfirmationDialog('Sign transaction for 1000 ETH?')
   }
   ```

## Conclusion

**Yes, you can:**

1. ✅ Create passkey on Desktop (macOS)
2. ✅ Sync via iCloud Keychain
3. ✅ Use on iPhone (iOS)
4. ✅ Get the exact same signatures

**This works because:**

- credentialId syncs via iCloud
- Key derivation is deterministic (HKDF)
- Signature generation is deterministic (RFC 6979)

**Security is maintained because:**

- Biometric required on each device
- Private key never leaves Secure Enclave
- iCloud sync is end-to-end encrypted
- User verification required for each signature

**Best practices:**

- Enable iCloud Keychain on all devices
- Use strong iCloud password + 2FA
- Test signature consistency across devices
- Consider supporting multiple passkeys for redundancy
