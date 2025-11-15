# How to Create Vercel Postgres Database

This guide shows you exactly how to create a PostgreSQL database on Vercel.

## Step-by-Step Instructions

### Step 1: Deploy Your Project to Vercel First

You need to have a project on Vercel before creating a database.

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login to Vercel
vercel login

# Deploy your project
vercel
```

**Follow the prompts:**
```
? Set up and deploy "~/Documents/Dev/passface"? [Y/n] Y
? Which scope do you want to deploy to? <Your Username>
? Link to existing project? [y/N] N
? What's your project's name? passface
? In which directory is your code located? ./
? Want to override the settings? [y/N] N
```

Vercel will:
1. Upload your code
2. Install dependencies
3. Build your app
4. Deploy it
5. Give you a URL like: `https://passface-xxx.vercel.app`

**Save this URL - you'll need it later!**

---

### Step 2: Go to Vercel Dashboard

1. Open your browser and go to: https://vercel.com/dashboard
2. You should see your `passface` project listed
3. Click on the project name

![Vercel Dashboard](https://vercel.com/docs/storage/vercel-postgres/quickstart/dashboard.png)

---

### Step 3: Navigate to Storage Tab

1. In your project, click the **"Storage"** tab at the top
2. You'll see options for different storage types:
   - Postgres
   - Blob
   - KV
   - Edge Config

![Storage Tab](https://vercel.com/docs/storage/vercel-postgres/quickstart/storage-tab.png)

---

### Step 4: Create Postgres Database

1. Click **"Create Database"** button
2. Select **"Postgres"** from the options
3. You'll see a form to fill out:

**Database Configuration:**
```
Database Name: passface-db
Region: Singapore (sin1)  ← Choose closest to your users
           or
           San Francisco (sfo1)
           or
           Washington D.C. (iad1)
```

**Pricing:**
- Development: Free for 14 days, then $0.02/hour ($14.40/month)
- You can delete it anytime to stop charges

4. Click **"Create"** button

![Create Database](https://vercel.com/docs/storage/vercel-postgres/quickstart/create-db.png)

---

### Step 5: Vercel Auto-Configures Environment Variables

**Immediately after creation, Vercel automatically:**

1. Creates the database
2. Adds these environment variables to your project:
   ```
   POSTGRES_URL="postgres://..."
   POSTGRES_PRISMA_URL="postgres://...?pgbouncer=true"
   POSTGRES_URL_NO_SSL="postgres://..."
   POSTGRES_URL_NON_POOLING="postgres://..."
   POSTGRES_USER="default"
   POSTGRES_HOST="..."
   POSTGRES_PASSWORD="..."
   POSTGRES_DATABASE="verceldb"
   ```

3. Links the database to your project

**You don't need to manually add these variables!** ✅

---

### Step 6: Configure Your Project for Vercel Postgres

You need to update your environment variables to use Vercel's variables:

#### Option A: Update in Vercel Dashboard (Recommended)

1. Go to your project → **Settings** → **Environment Variables**
2. Click **"Add New"**
3. Add these variables:

```bash
# Name: DATABASE_URL
# Value: ${POSTGRES_PRISMA_URL}
# Environment: Production, Preview, Development

# Name: DIRECT_URL
# Value: ${POSTGRES_URL_NON_POOLING}
# Environment: Production, Preview, Development

# Name: NEXT_PUBLIC_RP_ID
# Value: passface.vercel.app  ← Your actual domain
# Environment: Production, Preview, Development

# Name: NEXT_PUBLIC_ORIGIN
# Value: https://passface.vercel.app  ← Your actual domain
# Environment: Production, Preview, Development
```

**Important:** Replace `passface.vercel.app` with your actual Vercel domain!

![Environment Variables](https://vercel.com/docs/storage/vercel-postgres/quickstart/env-vars.png)

---

### Step 7: Redeploy Your Project

After adding environment variables, you need to redeploy:

```bash
# Redeploy to production
vercel --prod
```

Or click **"Redeploy"** button in Vercel Dashboard.

---

### Step 8: Run Database Migrations

Now that the database is created, you need to create the tables:

```bash
# Pull environment variables locally
vercel env pull .env.production

# Run migrations using the production database
npx prisma migrate deploy --schema ./prisma/schema.prisma
```

**Alternative (if above doesn't work):**

```bash
# Get the database URL from Vercel
vercel env pull

# Open .env.local and copy POSTGRES_URL_NON_POOLING value

# Run migration with that URL
DATABASE_URL="<paste-postgres-url-here>" npx prisma migrate deploy
```

---

### Step 9: Verify Database Setup

1. Go to Vercel Dashboard → Storage → Your Database
2. Click **"Query"** tab
3. Run this SQL to check tables:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

You should see:
```
table_name
-----------
User
Credential
_prisma_migrations
```

![Query Tab](https://vercel.com/docs/storage/vercel-postgres/quickstart/query.png)

---

### Step 10: Test Your Application

1. Open your Vercel URL: `https://passface-xxx.vercel.app`
2. Try to register with a passkey
3. Check the database to see if the user was created:

```sql
SELECT * FROM "User";
```

---

## Important Notes

### ⚠️ Database URL Variables

Vercel Postgres provides multiple connection strings:

```bash
POSTGRES_URL               # Direct connection (no pooling)
POSTGRES_PRISMA_URL        # With connection pooling (use for Prisma Client)
POSTGRES_URL_NON_POOLING   # Without pooling (use for migrations)
```

**For Prisma:**
- Use `POSTGRES_PRISMA_URL` for `DATABASE_URL` (app runtime)
- Use `POSTGRES_URL_NON_POOLING` for `DIRECT_URL` (migrations)

### 💰 Pricing

**Development Plan:**
- First 14 days: **FREE**
- After 14 days: **$0.02/hour** ($14.40/month)
- 256 MB storage included
- Additional storage: $0.30/GB

**You can delete the database anytime to stop charges.**

### 🔒 Security

- Database is automatically SSL-enabled
- Connection pooling via PgBouncer
- Automatic backups (on paid plan)
- Isolated per project

---

## Alternative: Use Neon (Free Forever)

If you want a completely free database:

### Neon Setup (5 minutes)

1. Go to https://neon.tech
2. Sign up (free)
3. Click **"Create Project"**
4. Name: `passface`
5. Region: Choose closest to you
6. Click **"Create Project"**

7. Copy the connection string:
   ```
   Connection string (pooled):
   postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/passface?sslmode=require

   Connection string (direct):
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/passface?sslmode=require
   ```

8. Add to Vercel environment variables:
   ```bash
   DATABASE_URL=<pooled connection string>
   DIRECT_URL=<direct connection string>
   ```

9. Redeploy Vercel

**Neon Free Tier:**
- ✅ 0.5 GB storage
- ✅ Unlimited compute (with autosuspend)
- ✅ Free forever
- ✅ No credit card required

---

## Troubleshooting

### Issue: "prisma migrate deploy failed"

**Solution:**
```bash
# Make sure you're using DIRECT_URL for migrations
DATABASE_URL="${DIRECT_URL}" npx prisma migrate deploy
```

### Issue: "Can't connect to database"

**Solution:**
1. Check environment variables are set in Vercel
2. Verify you redeployed after adding variables
3. Check the connection string format

```bash
# Test connection locally
vercel env pull
npx prisma db pull
```

### Issue: "Database doesn't exist"

**Solution:**
The database is created automatically. If you see this error:
1. Go to Vercel Dashboard → Storage
2. Verify the database is "Active"
3. Check you're using the correct POSTGRES_PRISMA_URL

### Issue: "Environment variable not found"

**Solution:**
```bash
# Pull the latest environment variables
vercel env pull .env.local

# Verify they exist
cat .env.local | grep POSTGRES
```

---

## Quick Reference Commands

```bash
# Deploy to Vercel
vercel --prod

# Pull environment variables
vercel env pull

# Run migrations
npx prisma migrate deploy

# View logs
vercel logs --follow

# Open project in browser
vercel open

# List environment variables
vercel env ls
```

---

## Complete Setup Checklist

- [ ] Install Vercel CLI: `pnpm add -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy project: `vercel`
- [ ] Create Postgres database in Vercel Dashboard
- [ ] Add environment variables:
  - [ ] `DATABASE_URL=${POSTGRES_PRISMA_URL}`
  - [ ] `DIRECT_URL=${POSTGRES_URL_NON_POOLING}`
  - [ ] `NEXT_PUBLIC_RP_ID=your-app.vercel.app`
  - [ ] `NEXT_PUBLIC_ORIGIN=https://your-app.vercel.app`
- [ ] Redeploy: `vercel --prod`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Test registration on live site
- [ ] Verify data in database

---

## Visual Guide

### Step 1: Vercel Dashboard
```
┌─────────────────────────────────────────────────┐
│  Vercel Dashboard                               │
│  ┌───────────────────────────────────────────┐ │
│  │ Your Projects                             │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │ passface                            │ │ │
│  │  │ https://passface.vercel.app         │ │ │
│  │  │ [Click to open] ←─────────────────  │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Step 2: Storage Tab
```
┌─────────────────────────────────────────────────┐
│  passface Project                               │
│  [Overview] [Deployments] [Analytics]           │
│  >>>>[Storage]<<<<                              │
│  ┌───────────────────────────────────────────┐ │
│  │  No databases yet                         │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │  [Create Database]  ←─────────────  │ │ │
│  │  │                                     │ │ │
│  │  │  Choose:                            │ │ │
│  │  │  • Postgres                         │ │ │
│  │  │  • Blob                             │ │ │
│  │  │  • KV                               │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Step 3: Create Database Form
```
┌─────────────────────────────────────────────────┐
│  Create Postgres Database                       │
│  ┌───────────────────────────────────────────┐ │
│  │  Database Name:                           │ │
│  │  [passface-db___________________]         │ │
│  │                                           │ │
│  │  Region:                                  │ │
│  │  [Singapore (sin1)▼]                      │ │
│  │                                           │ │
│  │  Pricing: Development                     │ │
│  │  $0.02/hour after 14-day trial            │ │
│  │                                           │ │
│  │  [Cancel]  [Create] ←─────────────────   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Step 4: Database Created
```
┌─────────────────────────────────────────────────┐
│  Storage → passface-db                          │
│  ┌───────────────────────────────────────────┐ │
│  │  Status: Active ✅                        │ │
│  │  Region: Singapore (sin1)                 │ │
│  │  Created: Just now                        │ │
│  │                                           │ │
│  │  [Data] [Query] [Settings]                │ │
│  │                                           │ │
│  │  Environment Variables (auto-added):      │ │
│  │  ✅ POSTGRES_URL                          │ │
│  │  ✅ POSTGRES_PRISMA_URL                   │ │
│  │  ✅ POSTGRES_URL_NON_POOLING              │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Next Steps After Setup

1. **Test your app**: Visit your Vercel URL and test passkey registration
2. **Monitor usage**: Go to Storage → Usage tab to see database metrics
3. **Set up backups**: Enable automatic backups in database settings
4. **Add custom domain** (optional): Settings → Domains

---

## Support Links

- **Vercel Postgres Docs**: https://vercel.com/docs/storage/vercel-postgres
- **Vercel Support**: https://vercel.com/support
- **Prisma + Vercel Guide**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel

---

That's it! You now have a PostgreSQL database connected to your Vercel app. 🎉
