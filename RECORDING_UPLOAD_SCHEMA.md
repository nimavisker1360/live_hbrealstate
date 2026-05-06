# Live Recording Upload Recovery — Database Schema

## Overview

PostgreSQL + Prisma implementation for storing and managing video uploads with chunked upload support.

---

## Prisma Schema

### Location
`prisma/schema.prisma`

### Enums

**LiveRecordingStatus** — Recording lifecycle state
```
LOCAL_PENDING  → File saved locally, not yet uploaded
UPLOADING      → Upload in progress
UPLOADED       → Chunks uploaded, assembly complete
FAILED         → Upload failed, can retry
PROCESSING     → Mux asset being created/processed
READY          → Recording ready for playback
```

**RecordingSourceType** — How the recording was created
```
LIVE_RECORDING → From a live stream (recovery scenario)
MANUAL_UPLOAD  → Manually selected file upload
```

**UploadSessionStatus** — Session lifecycle state
```
PENDING        → Session created, no chunks uploaded
ACTIVE         → Actively receiving chunks
COMPLETED      → All chunks uploaded, assembly done
EXPIRED        → Session expired (>24 hours)
CANCELLED      → User cancelled upload
```

---

## Models

### LiveRecording

Represents a video recording (either from live stream or manual upload).

**Fields:**
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| streamId | String? | FK → LiveSession (nullable for manual uploads) |
| userId | String? | Agent ID from session.sub |
| propertyId | String? | Property ID (for querying by property) |
| title | String | Display name for the recording |
| status | LiveRecordingStatus | Current state in workflow |
| sourceType | RecordingSourceType | Live or manual upload |
| fileName | String | Original file name (for deduplication) |
| fileSize | BigInt | File size in bytes |
| mimeType | String | Video MIME type (video/mp4, etc) |
| storageProvider | String? | Where file is stored (s3, local, etc) |
| storageUrl | String? | Full path to stored file |
| muxAssetId | String? | Mux asset ID (for playback) |
| playbackId | String? | Mux playback ID (for HLS URL) |
| uploadProgress | Int (0-100) | % complete |
| retryCount | Int | Number of retry attempts |
| errorMessage | String? | Last error encountered |
| uploadedAt | DateTime? | When upload completed |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

**Indexes:**
```
userId              → Find agent's recordings
streamId            → Find recordings for a session
status              → Filter by state (failed, ready, etc)
muxAssetId          → Look up by Mux asset
userId + fileName + fileSize → Deduplication
```

**Relations:**
```
liveSession         → LiveSession (optional FK)
uploadSessions      → UploadSession[] (reverse relation)
```

---

### UploadSession

Represents a chunked upload session. One LiveRecording can have multiple UploadSession rows if agent retries.

**Fields:**
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| recordingId | String | FK → LiveRecording (cascade delete) |
| userId | String? | Agent ID for query isolation |
| uploadId | String | Unique external upload ID (UUID) |
| status | UploadSessionStatus | Current session state |
| totalChunks | Int | Expected chunk count |
| uploadedChunks | Int | Chunks received so far |
| chunkSize | Int | Bytes per chunk (5MB minimum) |
| fileSize | BigInt | Total file size |
| expiresAt | DateTime | Session expires (24h from creation) |
| createdAt | DateTime | Session start time |
| updatedAt | DateTime | Last update time |

**Indexes:**
```
uploadId (UNIQUE)   → Look up session by client's uploadId
recordingId         → Find sessions for a recording
userId              → Query isolation
```

**Relations:**
```
recording           → LiveRecording (required FK)
```

---

## Migration

### Apply Schema

```bash
# Generate Prisma client with new models
npx prisma generate

# Push schema to database (creates tables, enums, indexes)
npx prisma db push

# Or create a managed migration (recommended for production)
npx prisma migrate dev --name add_live_recording_upload_session
```

### Verify

```bash
# Check tables created
npx prisma studio

# Or query directly
psql -c "\dt live*"
```

---

## API Assumptions

### Deduplication Logic
When agent calls `POST /api/live-recordings/upload/init`:

1. **Check for existing** recording with:
   - `userId` = session.sub
   - `fileName` = request.fileName
   - `fileSize` = request.fileSize

2. **If found:**
   - Status `READY|PROCESSING|UPLOADED` → 409 conflict
   - Status `FAILED` → Reset status to LOCAL_PENDING, increment retryCount
   - Status `LOCAL_PENDING|UPLOADING` → Check for active UploadSession
     - If active session exists → Return it (resume)
     - If no active session → Create new session (retry from beginning)

3. **If not found:** Create new LiveRecording + UploadSession

### Upload Session Lifecycle

```
POST /init
  ↓
Creates: LiveRecording (status: LOCAL_PENDING)
         UploadSession (status: ACTIVE, expiresAt: now+24h)
Returns: uploadSessionId, uploadId, uploadedChunks

POST /chunk (repeat for each)
  ↓
Validates: session exists, ACTIVE, not expired
Saves: chunk to disk at /tmp/uploads/{uploadSessionId}/chunk-{index}
Updates: uploadedChunks counter
Returns: uploadedChunks, isComplete

POST /complete
  ↓
Validates: all chunks present and uploadedChunks == totalChunks
Assembles: chunks into final.mp4
Creates: Mux asset (async)
Updates: LiveRecording (status: UPLOADED|PROCESSING, muxAssetId, playbackId, uploadedAt)
         UploadSession (status: COMPLETED)
Returns: recordingId, status, playbackId
```

### Session Expiry

- Sessions expire 24 hours after creation (`expiresAt`)
- Chunk upload rejects if `expiresAt < now()`
- Cleanup: scheduled job to delete expired sessions (not yet implemented)

### Failure Scenarios

| Scenario | Status Code | Action |
|----------|-------------|--------|
| Chunk file missing on complete | 500 | User retries /init, continues from uploadedChunks |
| Mux asset creation fails | 502 | Recording marked UPLOADED anyway, user retries later |
| Session expired | 410 | User calls /init again (new session) |
| User cancelled | — | Frontend calls POST /api/live-recordings/upload/cancel |

---

## Querying Examples

### Get agent's recordings
```ts
const recordings = await prisma.liveRecording.findMany({
  where: { userId: agentId },
  orderBy: { createdAt: 'desc' },
  take: 50,
});
```

### Get failed recordings for retry
```ts
const failed = await prisma.liveRecording.findMany({
  where: { 
    userId: agentId,
    status: 'FAILED',
  },
  orderBy: { updatedAt: 'asc' },
});
```

### Get active upload sessions
```ts
const active = await prisma.uploadSession.findMany({
  where: {
    status: 'ACTIVE',
    expiresAt: { gt: new Date() },
  },
  include: { recording: true },
});
```

### Check for duplicate
```ts
const existing = await prisma.liveRecording.findFirst({
  where: {
    userId: agentId,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
  },
});
```

---

## Performance Considerations

### Indexes
- Composite index on `(userId, fileName, fileSize)` enables efficient deduplication checks
- Separate indexes on `userId`, `streamId`, `status` for common filters
- `uploadId UNIQUE` index ensures fast session lookups

### BigInt Fields
- `fileSize` and `fileSize` in UploadSession use BIGINT (8 bytes) to support files up to 10 GB
- JavaScript treats BigInt as `bigint` type in Prisma client
- Conversion: `Number(recording.fileSize)` when needed for JSON response

### Cascade Deletes
- Deleting a `LiveRecording` cascades to delete all its `UploadSession` rows
- Deleting a `LiveSession` sets `streamId = NULL` on `LiveRecording` (soft delete)

---

## Seed Data (Optional)

```ts
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create test recording
  const recording = await prisma.liveRecording.create({
    data: {
      userId: "agent-test-id",
      fileName: "property-tour.mp4",
      fileSize: 1024 * 1024 * 500, // 500 MB
      mimeType: "video/mp4",
      title: "Property Tour - Downtown Loft",
      status: "LOCAL_PENDING",
      sourceType: "LIVE_RECORDING",
      uploadProgress: 0,
      retryCount: 0,
    },
  });

  console.log("Created test recording:", recording.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
```

Run with:
```bash
npx ts-node prisma/seed.ts
```

---

## TypeScript Types (Auto-generated)

After running `npx prisma generate`, types are available:

```ts
import type { LiveRecording, UploadSession } from "@prisma/client";

// Use in API routes/functions
async function getRecording(id: string): Promise<LiveRecording | null> {
  return prisma.liveRecording.findUnique({ where: { id } });
}

// Full type-safe queries
const session: UploadSession = await prisma.uploadSession.create({
  data: {
    recordingId: "rec_...",
    uploadId: "uuid-...",
    status: "ACTIVE", // Type-checked enum
    totalChunks: 100,
    chunkSize: 5242880,
    fileSize: BigInt(524288000),
    expiresAt: new Date(Date.now() + 86400000),
  },
});
```

---

## Database Connection

**Environment Variables** (`.env`)
```
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
DIRECT_URL="postgresql://user:password@host:port/database?schema=public"
```

`DATABASE_URL` used by Prisma for migrations  
`DIRECT_URL` used for direct connections (bypasses connection pooling)

---

## Troubleshooting

### Migration Failed
```bash
# Reset database (DESTRUCTIVE)
npx prisma migrate reset

# Or review migration status
npx prisma migrate status
```

### Tables Not Visible
```bash
# Regenerate Prisma client
npx prisma generate

# Restart development server
npm run dev
```

### Type Errors
```bash
# Ensure generated types are current
rm -rf src/generated/prisma/
npx prisma generate
```

---

## Related APIs

| Endpoint | Model | Action |
|----------|-------|--------|
| POST /api/live-recordings/upload/init | LiveRecording + UploadSession | CREATE |
| POST /api/live-recordings/upload/chunk | UploadSession | UPDATE (uploadedChunks) |
| POST /api/live-recordings/upload/complete | LiveRecording + UploadSession | UPDATE (status, muxAssetId) |
| GET /api/live-recordings | LiveRecording[] | READ |
| GET /api/live-recordings/{id} | LiveRecording | READ |

---

## Next Steps

1. ✅ Schema defined in `prisma/schema.prisma`
2. ⏳ Run `npx prisma db push` to apply to database
3. ⏳ Run `npx prisma generate` to update types
4. ✅ API routes implemented and tested
5. ✅ Client components built
6. 🔄 Monitor real uploads for edge cases
