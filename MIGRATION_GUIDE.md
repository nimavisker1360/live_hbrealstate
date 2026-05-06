# Database Migration Guide for Live Recording Upload Recovery

This guide walks through applying the LiveRecording and UploadSession models to your PostgreSQL database.

---

## Pre-Migration Checklist

- ✅ Database is PostgreSQL (not SQLite or MySQL)
- ✅ `DATABASE_URL` and `DIRECT_URL` are set in `.env`
- ✅ Database server is running and accessible
- ✅ You have write permissions to the database
- ✅ No conflicting schema (check for existing `LiveRecording` table)

---

## Step 1: Verify Prisma Configuration

```bash
# Check connection
npx prisma db execute --stdin <<'EOF'
SELECT version();
EOF
```

Expected output: PostgreSQL version information

If this fails:
- Verify `DATABASE_URL` in `.env`
- Ensure database server is running
- Check credentials and network access

---

## Step 2: Generate Prisma Client

```bash
# Generate TypeScript types and Prisma client
npx prisma generate
```

This reads `prisma/schema.prisma` and generates:
- `src/generated/prisma/client.ts` (Prisma client with type inference)
- `src/generated/prisma/index.d.ts` (type definitions)
- `src/generated/prisma/enums.ts` (enum types)

**Output should show:**
```
✔ Generated Prisma Client (7.8.0) to ./src/generated/prisma in XXXms
```

---

## Step 3: Create & Review Migration

### Option A: Automated Migration (Recommended)

```bash
# Create a new migration with auto-generated SQL
npx prisma migrate dev --name add_live_recording_upload_session
```

This will:
1. Detect schema changes from `prisma/schema.prisma`
2. Generate SQL migration file
3. Apply to database
4. Regenerate Prisma client

**When prompted:** "Do you want to reset the database?" → Answer **no** (unless your DB is empty)

**Output should show:**
```
✔ Your database is now in sync with your schema.
✔ Generated Prisma Client (7.8.0) to ./src/generated/prisma in XXXms
```

### Option B: Manual SQL (For Production)

If you want to review SQL before applying:

```bash
# Generate SQL without applying
npx prisma migrate diff --from-empty --to-schema-datasource prisma/schema.prisma --script > migration.sql

# Review the SQL
cat migration.sql

# Apply manually
psql $DATABASE_URL < migration.sql
```

---

## Step 4: Verify Migration

### Check Tables Were Created

```bash
# List new tables
psql $DATABASE_URL -c "\dt \"LiveRecording\" \"UploadSession\""
```

Expected output:
```
            List of relations
 Schema |       Name       | Type  | Owner
--------+------------------+-------+-------
 public | LiveRecording    | table | user
 public | UploadSession    | table | user
```

### Check Enums Were Created

```bash
psql $DATABASE_URL -c "\dT"
```

Should show:
```
LiveRecordingStatus
RecordingSourceType
UploadSessionStatus
```

### Check Indexes

```bash
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename IN ('LiveRecording', 'UploadSession')"
```

Should show multiple indexes:
```
LiveRecording_userId_idx
LiveRecording_streamId_idx
LiveRecording_status_idx
LiveRecording_muxAssetId_idx
LiveRecording_userId_fileName_fileSize_idx
UploadSession_uploadId_key
UploadSession_recordingId_idx
UploadSession_userId_idx
```

### Verify Foreign Keys

```bash
psql $DATABASE_URL -c "
  SELECT constraint_name, table_name, column_name
  FROM information_schema.key_column_usage
  WHERE table_name IN ('LiveRecording', 'UploadSession')
  ORDER BY table_name;
"
```

---

## Step 5: Seed Test Data (Optional)

```bash
# Run seed script to populate test data
npx ts-node prisma/seed.ts
```

This creates:
- Test agent and property
- 4 sample recordings (pending, failed, processing, ready)
- 1 sample upload session

**Output:**
```
Seeding database with test recording data...
Created test recordings:
  - property-tour-morning.mp4 (LOCAL_PENDING)
  - stream-backup.mp4 (FAILED)
  - interior-walkthrough.mp4 (PROCESSING)
  - rooftop-views.mp4 (READY)

Created test upload session: upload-session-test-1
  Progress: 65/100 chunks

✓ Seed completed successfully
```

Verify in Prisma Studio:
```bash
npx prisma studio
```

---

## Step 6: Test API Endpoints

### Test GET /api/live-recordings

```bash
# Get recordings for an agent
curl -X GET http://localhost:3000/api/live-recordings \
  -H "Cookie: hb_live_session=YOUR_JWT_TOKEN"
```

Expected response:
```json
{
  "data": [
    {
      "id": "rec-ready-1",
      "fileName": "rooftop-views.mp4",
      "status": "READY",
      "uploadedAt": "2026-05-05T12:00:00.000Z",
      "playbackId": "playback-id-ready-1"
    }
  ]
}
```

### Test Upload Init

```bash
curl -X POST http://localhost:3000/api/live-recordings/upload/init \
  -H "Content-Type: application/json" \
  -H "Cookie: hb_live_session=YOUR_JWT_TOKEN" \
  -d '{
    "fileName": "test-upload.mp4",
    "fileSize": 1024000,
    "mimeType": "video/mp4",
    "totalChunks": 1,
    "chunkSize": 5242880
  }'
```

Expected response:
```json
{
  "data": {
    "recordingId": "rec_...",
    "uploadSessionId": "sess_...",
    "uploadId": "uuid-...",
    "chunkSize": 5242880,
    "totalChunks": 1,
    "uploadedChunks": 0,
    "isResume": false,
    "expiresAt": "2026-05-07T12:00:00Z"
  }
}
```

---

## Step 7: Update package.json (Optional)

Add seed script to `package.json`:

```json
{
  "scripts": {
    "db:seed": "ts-node prisma/seed.ts",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

Then use:
```bash
npm run db:seed
npm run db:migrate
npm run db:studio
```

---

## Rollback (If Needed)

### Rollback to Previous Migration

```bash
# List migrations
npx prisma migrate status

# Rollback the latest migration
npx prisma migrate resolve --rolled-back add_live_recording_upload_session
```

Or manually drop tables:
```bash
psql $DATABASE_URL -c "
  DROP TABLE IF EXISTS \"UploadSession\" CASCADE;
  DROP TABLE IF EXISTS \"LiveRecording\" CASCADE;
  DROP TYPE IF EXISTS \"LiveRecordingStatus\" CASCADE;
  DROP TYPE IF EXISTS \"RecordingSourceType\" CASCADE;
  DROP TYPE IF EXISTS \"UploadSessionStatus\" CASCADE;
"
```

Then regenerate:
```bash
npx prisma generate
```

---

## Troubleshooting

### Error: "relation \"LiveRecording\" does not exist"

**Cause:** Migration not applied yet

**Fix:**
```bash
npx prisma db push
npx prisma generate
```

### Error: "permission denied for schema public"

**Cause:** Database user lacks permissions

**Fix:**
```sql
-- Connect as PostgreSQL superuser
GRANT USAGE ON SCHEMA public TO your_user;
GRANT CREATE ON SCHEMA public TO your_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO your_user;
```

### Error: "enum type \"LiveRecordingStatus\" already exists"

**Cause:** Enum already created in a previous migration

**Fix:** Verify with `\dT` and either:
1. Manually drop if creating fresh: `DROP TYPE IF EXISTS "LiveRecordingStatus" CASCADE;`
2. Or skip this step if already applied

### Migration Hangs

**Cause:** Database lock or slow operation

**Fix:**
```bash
# Kill long-running queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';"

# Try again with timeout
PRISMA_SKIP_VALIDATION=0 npx prisma db push --force-reset
```

---

## Production Deployment

### 1. Review Migrations

```bash
# Check what will be deployed
npx prisma migrate status
```

### 2. Create Backup

```bash
# Backup before migration
pg_dump $DATABASE_URL > backup-$(date +%s).sql
```

### 3. Apply Migration

```bash
# Deploy via release process
npx prisma migrate deploy
```

This applies all pending migrations and exits with non-zero code on failure.

### 4. Verify

```bash
# Check migration status
npx prisma migrate status

# Should show: "All migrations have been successfully applied."
```

### 5. Monitor Performance

After migration, monitor:
- Slow queries: check index usage
- Connection pool: ensure sufficient capacity
- Disk space: verify growth rate

---

## Monitoring & Maintenance

### Regular Maintenance

```bash
# Analyze tables for query optimizer
psql $DATABASE_URL -c "ANALYZE \"LiveRecording\"; ANALYZE \"UploadSession\";"

# Check table size
psql $DATABASE_URL -c "
  SELECT 
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as size
  FROM pg_stat_user_tables
  WHERE relname IN ('LiveRecording', 'UploadSession');
"
```

### Vacuum Old Data

```bash
# Remove dead tuples (do not run during business hours)
psql $DATABASE_URL -c "VACUUM ANALYZE \"LiveRecording\";"
```

### Monitor Growth

```bash
# Check records count
psql $DATABASE_URL -c "
  SELECT 
    'LiveRecording' as table,
    count(*) as records
  FROM \"LiveRecording\"
  UNION ALL
  SELECT 
    'UploadSession',
    count(*)
  FROM \"UploadSession\";
"
```

---

## Summary Checklist

- ✅ `npx prisma generate` — Generate client
- ✅ `npx prisma migrate dev` — Create and apply migration
- ✅ Verify tables in psql or Prisma Studio
- ✅ Test API endpoints
- ✅ (Optional) Seed test data
- ✅ Deploy to production

---

## Next Steps

1. **API Routes:** Live at `/api/live-recordings/*`
2. **Client:** Upload page available at `/dashboard/live/upload-recovery`
3. **Monitoring:** Set up logs for upload failures
4. **Backups:** Schedule daily PostgreSQL backups
5. **Testing:** Run end-to-end upload tests on staging

---

## Questions?

Refer to:
- Prisma docs: https://www.prisma.io/docs
- PostgreSQL docs: https://www.postgresql.org/docs
- Our schema doc: `RECORDING_UPLOAD_SCHEMA.md`
