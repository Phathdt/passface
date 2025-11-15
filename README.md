# Passface - WebAuthn Passkey Authentication with Deterministic Message Signing

A Next.js application that combines WebAuthn passkey authentication with deterministic message signing capabilities, producing ethers.js-compatible signatures.

## 🚀 Features

- **Passwordless Authentication**: Login with Face ID, Touch ID, or security keys
- **Deterministic Signing**: Same message always produces the same signature (RFC 6979)
- **Ethers.js Compatible**: Signatures work with Ethereum and Web3 applications
- **Cross-Device Sync**: Use the same passkey on multiple devices (via iCloud/Google)
- **Secure Key Derivation**: HKDF-based key generation from passkey credentials
- **End-to-End Encryption**: Keys encrypted in browser storage

## 📋 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Authentication**: SimpleWebAuthn (WebAuthn implementation)
- **Cryptography**: @noble/secp256k1, @noble/hashes
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel
- **Storage**: IndexedDB for encrypted keys

## 🏗️ Architecture

```
User Registration:
1. Create passkey (biometric) → credentialId
2. Derive signing key: HKDF(credentialId + userId)
3. Store encrypted key in IndexedDB

Message Signing:
1. Authenticate with biometric
2. Retrieve encrypted signing key
3. Sign message with RFC 6979 deterministic ECDSA
4. Output: 65-byte ethers.js compatible signature
```

## 🔧 Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- Docker (for local PostgreSQL)
- A Vercel account (for deployment)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/passface.git
cd passface
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Local Database

#### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL with Docker Compose
docker compose up -d

# Run migrations
npx prisma migrate dev
```

#### Option B: Using Existing PostgreSQL

```bash
# Create .env.local
cp .env.example .env.local

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/passface_dev"
DIRECT_URL="postgresql://user:password@localhost:5432/passface_dev"

# Run migrations
npx prisma migrate dev
```

### 4. Configure Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://passface:passface_dev_password@localhost:5432/passface_dev"
DIRECT_URL="postgresql://passface:passface_dev_password@localhost:5432/passface_dev"

# WebAuthn (for local development)
NEXT_PUBLIC_RP_ID="localhost"
NEXT_PUBLIC_ORIGIN="http://localhost:3000"
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🧪 Testing the App

1. **Register**: Click "Register" and use your biometric (Face ID/Touch ID)
2. **Sign Message**: Enter a message and click "Sign Message"
3. **Verify**: The same message will always produce the same signature
4. **Logout & Login**: Sign the same message again - signature matches!

## 📦 Deployment to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Set Up Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your project → **Storage** tab
3. Click **"Create Database"** → Select **Postgres**
4. Name: `passface-db`, Region: Choose closest to you

### Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
DATABASE_URL=${POSTGRES_PRISMA_URL}
DIRECT_URL=${POSTGRES_URL_NON_POOLING}
NEXT_PUBLIC_RP_ID=your-app.vercel.app
NEXT_PUBLIC_ORIGIN=https://your-app.vercel.app
```

**Important**: Replace `your-app.vercel.app` with your actual Vercel domain!

### Run Migrations

```bash
# Pull production environment variables
vercel env pull .env.production

# Run migrations on production database
npx prisma migrate deploy
```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[VERCEL_POSTGRES_SETUP.md](./VERCEL_POSTGRES_SETUP.md)** - How to create Vercel Postgres database
- **[DEPLOYMENT_STEPS.md](./DEPLOYMENT_STEPS.md)** - Automatic vs manual migrations
- **[SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md)** - Security model and threat analysis
- **[CROSS_DEVICE_SIGNING.md](./CROSS_DEVICE_SIGNING.md)** - How cross-device sync works

## 🔐 Security

### Key Security Features

- ✅ **Biometric Required**: Every signature requires Face ID/Touch ID
- ✅ **Device-Bound**: Private keys never leave the device's secure enclave
- ✅ **Encrypted Storage**: Keys encrypted at rest in IndexedDB
- ✅ **No Server Keys**: Server only stores public keys
- ✅ **Deterministic Signing**: RFC 6979 prevents nonce reuse attacks

### Security Best Practices

1. **Always verify what you're signing** - The UI shows message content
2. **Enable 2FA on iCloud/Google** - Protects passkey sync
3. **Use HTTPS in production** - Required for WebAuthn
4. **Review signatures** - Check output before using

For detailed security analysis, see [SECURITY_ANALYSIS.md](./SECURITY_ANALYSIS.md).

## 🛠️ Development

### Project Structure

```
passface/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── register/      # Passkey registration
│   │   │   ├── authenticate/  # Passkey authentication
│   │   │   └── logout/        # Session logout
│   │   ├── page.tsx           # Homepage
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   └── PasskeyAuth.tsx    # Main auth component
│   ├── lib/                   # Library code
│   │   ├── auth/              # WebAuthn config
│   │   ├── crypto/            # Cryptography modules
│   │   │   ├── keyDerivation.ts  # HKDF key derivation
│   │   │   ├── signing.ts        # Message signing
│   │   │   └── encryption.ts     # AES-GCM encryption
│   │   ├── storage/           # IndexedDB storage
│   │   └── db/                # Database client
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── public/                    # Static files
└── docs/                      # Documentation
```

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
npx prisma migrate dev    # Create and apply migration
npx prisma migrate deploy # Apply migrations (production)
npx prisma studio         # Open Prisma Studio
npx prisma db push        # Sync schema (dev only)

# Code Quality
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint errors
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting

# Deployment
vercel                # Deploy to preview
vercel --prod         # Deploy to production
vercel logs --follow  # View logs
```

### Database Schema

```prisma
model User {
  id          String       @id @default(cuid())
  username    String       @unique
  credentials Credential[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Credential {
  id           String   @id @default(cuid())
  credentialId String   @unique
  publicKey    String
  signCount    Int      @default(0)
  transports   String
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 🌐 Browser Support

### Desktop
- ✅ Chrome 67+
- ✅ Firefox 60+
- ✅ Safari 13+
- ✅ Edge 18+

### Mobile
- ✅ iOS Safari 14+
- ✅ Chrome Android 70+
- ✅ Samsung Internet 10+

**Note**: WebAuthn requires HTTPS in production (localhost works for development).

## 🔄 Cross-Device Support

### Platform Syncing

| From | To | Sync Method | Same Signatures? |
|------|-----|-------------|------------------|
| macOS | iPhone | iCloud Keychain | ✅ YES |
| Windows | Android | Google Password Manager | ✅ YES |
| macOS | Android | ❌ No sync | ❌ Different |

See [CROSS_DEVICE_SIGNING.md](./CROSS_DEVICE_SIGNING.md) for details.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SimpleWebAuthn](https://simplewebauthn.dev/) - WebAuthn implementation
- [Noble Cryptography](https://github.com/paulmillr/noble-secp256k1) - Cryptographic primitives
- [Prisma](https://www.prisma.io/) - Database ORM
- [Vercel](https://vercel.com/) - Deployment platform

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/passface/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/passface/discussions)
- **Documentation**: Check the `/docs` folder for detailed guides

## 🔗 Useful Links

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [RFC 6979: Deterministic ECDSA](https://datatracker.ietf.org/doc/html/rfc6979)
- [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Built with ❤️ using Next.js and WebAuthn**
