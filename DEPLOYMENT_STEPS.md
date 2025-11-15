# Deployment Steps: Automatic vs Manual Migrations

## Understanding Vercel Build Process

### Current Configuration

Your `package.json` has:
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

**This means migrations run AUTOMATICALLY on every deploy.**

---

## Deployment Strategy: Choose One

### Strategy 1: Automatic Migrations (Recommended for Production)

**Pros:**
- ✅ Migrations always run when you deploy
- ✅ No manual steps after deployment
- ✅ Database always in sync with code

**Cons:**
- ❌ First deployment will fail (no database yet)
- ❌ Need two-step setup process

**Best for:** Production apps where you want automation

---

### Strategy 2: Manual Migrations

**Pros:**
- ✅ More control over when migrations run
- ✅ First deployment succeeds
- ✅ Can test migrations before applying

**Cons:**
- ❌ Easy to forget to run migrations
- ❌ Database can get out of sync with code
- ❌ Extra manual step after each deploy

**Best for:** Development/testing environments

---

## Recommended Approach: Hybrid Strategy

Use automatic migrations, but handle the first deployment specially.

### Step-by-Step Deployment

#### Step 1: Prepare for First Deployment

Temporarily modify `package.json`:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "migrate:deploy": "prisma migrate deploy"
  }
}
```

Commit this change:
```bash
git add package.json
git commit -m "chore: disable auto-migration for initial deploy"
```

#### Step 2: First Deployment

```bash
# Deploy to Vercel (migrations disabled)
vercel --prod
```

This will:
1. ✅ Upload code
2. ✅ Install dependencies
3. ✅ Generate Prisma Client
4. ✅ Build Next.js
5. ✅ Deploy successfully (no migration errors)

**Save your deployment URL:** `https://passface-xxx.vercel.app`

#### Step 3: Create Database

1. Go to Vercel Dashboard → Your Project → Storage
2. Click "Create Database"
3. Select "Postgres"
4. Name: `passface-db`
5. Region: Choose closest to you
6. Click "Create"

#### Step 4: Add Environment Variables

Go to Settings → Environment Variables and add:

```bash
DATABASE_URL=${POSTGRES_PRISMA_URL}
DIRECT_URL=${POSTGRES_URL_NON_POOLING}
NEXT_PUBLIC_RP_ID=your-app.vercel.app
NEXT_PUBLIC_ORIGIN=https://your-app.vercel.app
```

#### Step 5: Run Migrations Manually (First Time)

```bash
# Pull environment variables
vercel env pull .env.production

# Run migration
npx prisma migrate deploy
```

**Or run directly with Vercel CLI:**
```bash
vercel env pull
DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env | cut -d '=' -f2-) \
  npx prisma migrate deploy
```

#### Step 6: Enable Automatic Migrations

Update `package.json` back to:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

Commit and push:
```bash
git add package.json
git commit -m "chore: enable automatic migrations"
git push
```

#### Step 7: Redeploy

```bash
vercel --prod
```

Now migrations will run automatically on every deployment! ✅

---

## How Automatic Migrations Work

### On Every Deployment:

```
┌─────────────────────────────────────────────────┐
│  Vercel Build Process                           │
│                                                  │
│  1. git clone your repo                         │
│  2. pnpm install                                │
│     └→ postinstall: prisma generate             │
│                                                  │
│  3. vercel-build script:                        │
│     ├→ prisma generate     ✅                   │
│     ├→ prisma migrate deploy  ✅                │
│     │   ├─ Check migrations table              │
│     │   ├─ Apply pending migrations            │
│     │   └─ Skip if already applied             │
│     └→ next build           ✅                   │
│                                                  │
│  4. Deploy to serverless functions              │
└─────────────────────────────────────────────────┘
```

### What `prisma migrate deploy` Does:

```sql
-- 1. Checks _prisma_migrations table
SELECT * FROM _prisma_migrations;

-- 2. Compares with local migration files
-- If migration already applied → Skip ✅
-- If migration pending → Apply ✅

-- 3. Runs pending migrations
-- Example:
-- Migration: 20251115044336_init
CREATE TABLE "User" (...);
CREATE TABLE "Credential" (...);

-- 4. Records in _prisma_migrations
INSERT INTO _prisma_migrations VALUES (...);
```

---

## Advanced: Environment-Specific Strategies

### Development (Preview Deployments)

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma db push && next build"
  }
}
```

**Why `db push` instead of `migrate deploy`?**
- Faster (no migration files needed)
- Good for quick iterations
- Auto-creates database schema

### Production

```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

**Why `migrate deploy`?**
- Safe (uses migration files)
- Version controlled
- Rollback possible

---

## Handling Migration Failures

### What If Migration Fails During Deploy?

```
vercel-build script:
  prisma generate       ✅
  prisma migrate deploy ❌ FAILED!
  next build            ⏭️ SKIPPED

Result: Deployment FAILS ❌
```

### Debug Failed Deployment:

```bash
# View deployment logs
vercel logs --follow

# Check what went wrong
# Common errors:
# - DATABASE_URL not set
# - Database not accessible
# - Migration syntax error
# - Conflicting schema changes
```

### Fix and Redeploy:

```bash
# Fix the issue (e.g., update migration file)
git add prisma/migrations/
git commit -m "fix: migration issue"

# Redeploy
vercel --prod
```

---

## Manual Migration Commands

If you prefer manual control:

```json
{
  "scripts": {
    "vercel-build": "prisma generate && next build",
    "migrate:deploy": "prisma migrate deploy"
  }
}
```

### Run Migrations Manually:

**Option 1: Using Vercel CLI**
```bash
vercel env pull
npx prisma migrate deploy
```

**Option 2: Using Vercel Postgres CLI**
```bash
# If you have Vercel Postgres
vercel postgres connect

# Then in psql
\i prisma/migrations/20251115044336_init/migration.sql
```

**Option 3: Direct Database Connection**
```bash
# Get connection string from Vercel
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Best Practices

### ✅ DO:

1. **Use automatic migrations in production**
   ```json
   "vercel-build": "prisma generate && prisma migrate deploy && next build"
   ```

2. **Test migrations locally first**
   ```bash
   pnpm prisma migrate dev --name your_migration
   ```

3. **Commit migration files**
   ```bash
   git add prisma/migrations/
   git commit -m "feat: add new column"
   ```

4. **Use migration names that describe changes**
   ```bash
   npx prisma migrate dev --name add_user_avatar
   ```

### ❌ DON'T:

1. **Don't use `db push` in production**
   - No migration history
   - Can't rollback
   - Destructive changes

2. **Don't manually edit migration files after applying**
   - Create new migration instead

3. **Don't skip migrations**
   - Database will be out of sync

4. **Don't ignore migration errors**
   - Fix them before deploying

---

## Vercel Build Script Reference

### Minimal (No Auto-Migration)
```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "prisma generate && next build"
  }
}
```

### Recommended (Auto-Migration)
```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

### With Error Handling
```json
{
  "scripts": {
    "vercel-build": "prisma generate && (prisma migrate deploy || echo 'Migration failed but continuing...') && next build"
  }
}
```

### Environment-Specific
```json
{
  "scripts": {
    "vercel-build": "prisma generate && npm run db:migrate && next build",
    "db:migrate": "if [ \"$VERCEL_ENV\" = \"production\" ]; then prisma migrate deploy; else prisma db push; fi"
  }
}
```

---

## Complete Deployment Checklist

### Initial Setup
- [ ] Modify `package.json` to disable auto-migration
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Create Postgres database in Vercel Dashboard
- [ ] Add environment variables (DATABASE_URL, DIRECT_URL, etc.)
- [ ] Run migrations manually: `npx prisma migrate deploy`
- [ ] Test the app works
- [ ] Enable auto-migration in `package.json`
- [ ] Commit and redeploy: `vercel --prod`

### Future Deployments
- [ ] Create migration locally: `npx prisma migrate dev`
- [ ] Test migration works
- [ ] Commit migration files
- [ ] Push to Git: `git push`
- [ ] Vercel auto-deploys and runs migrations ✅

---

## Troubleshooting

### Issue: "prisma migrate deploy failed"

**Check logs:**
```bash
vercel logs --follow
```

**Common causes:**
1. DATABASE_URL not set → Add in Vercel Dashboard
2. Database not accessible → Check region/firewall
3. Migration syntax error → Fix migration file
4. Applied migration edited → Create new migration

### Issue: "Database is out of sync"

**Reset and redeploy:**
```bash
# Pull latest env vars
vercel env pull

# Reset migrations (WARNING: deletes data!)
npx prisma migrate reset

# Or manually sync
npx prisma db push
npx prisma migrate deploy
```

### Issue: "Build succeeded but app crashes"

**Check migration actually ran:**
```bash
# Connect to database
vercel postgres connect

# Check tables exist
\dt

# Should see:
# User
# Credential
# _prisma_migrations
```

---

## Summary

### Quick Answer:

**YES, migrations run automatically** with your current `vercel-build` script:
```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

### But for first deployment:

1. Temporarily disable auto-migration
2. Deploy app
3. Create database
4. Run migration manually
5. Re-enable auto-migration
6. All future deployments run migrations automatically ✅

### The Magic Command:

After setup, every time you push code:
```bash
git push
```

Vercel will:
1. Build your app
2. Run `prisma migrate deploy` automatically
3. Apply any new migrations
4. Deploy your app

**No manual steps needed!** 🎉
