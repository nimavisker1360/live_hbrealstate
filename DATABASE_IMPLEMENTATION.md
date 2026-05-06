# Live Recording Upload Recovery — Complete Database Implementation

## Overview

**Database:** PostgreSQL 12+  
**ORM:** Prisma 7.8.0  
**Language:** TypeScript  

Complete database layer for chunked video upload with recovery, deduplication, and retry logic.

---

## Architecture

```
┌─────────────────────────────────────────┐
│ Application Layer                       │
│ (API Routes + Components)               │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│ Prisma Client (Type-Safe ORM)           │
│ - LiveRecording                         │
│ - UploadSession                         │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│ PostgreSQL (Data Layer)                 │
│ - LiveRecording table                   │
│ - UploadSession table                   │
│ - 3 Enums                               │
│ - 8 Indexes                             │
│ - 2 Foreign keys                        │
└─────────────────────────────────────────┘
```

---

## Data Models

### LiveRecording

Represents a single video file, from creation through upload and Mux processing.

```ts
type LiveRecording = {
  id: string;                    // Primary key (cuid)
  streamId?: string;             // FK to LiveSession (nullable)
  userId?: string;               // Agent ID from session.sub
  propertyId?: string;           // FK to Property (nullable)
  title: string;                 // Display name
  status: LiveRecordingStatus;   // Enum: LOCAL_PENDING → READY
  sourceType: RecordingSourceType; // LIVE_RECORDING | MANUAL_UPLOAD
  fileName: string;              // Original filename (for dedup)
  fileSize: bigint;              // Bytes (BigInt for >2GB)
  mimeType: string;              // video/mp4, video/quicktime, video/webm
  storageProvider?: string;      // s3, local, etc (future)
  storageUrl?: string;           // Full path to file
  muxAssetId?: string;           // Mux asset ID
  playbackId?: string;           // Mux playback ID (for HLS)
  uploadProgress: number;        // 0-100 %
  retryCount: number;            // Incremented on retry
  errorMessage?: string;         // Last error text
  uploadedAt?: Date;             // When upload completed
  createdAt: Date;               // Record created
  updatedAt: Date;               // Last modified
};
```

**Lifecycle:**
```
LOCAL_PENDING → UPLOADING → UPLOADED → PROCESSING → READY
                           ↘ FAILED ↗ (with retries)
```

**Indexes (for performance):**
| Index | Use Case |
|-------|----------|
| userId | Get all recordings for an agent |
| streamId | Find recordings for a session |
| status | Filter by state (ready, failed, processing) |
| muxAssetId | Lookup by Mux ID for Mux webhooks |
| (userId, fileName, fileSize) | Deduplication check |

### UploadSession

Represents a single chunked upload attempt. One LiveRecording can have multiple if agent retries.

```ts
type UploadSession = {
  id: string;                    // Primary key (cuid)
  recordingId: string;           // FK to LiveRecording (cascade delete)
  userId?: string;               // Agent ID (query isolation)
  uploadId: string;              // Unique external ID (UUID)
  status: UploadSessionStatus;   // Enum: PENDING → COMPLETED
  totalChunks: number;           // Expected chunk count
  uploadedChunks: number;        // Chunks received
  chunkSize: number;             // Bytes per chunk (5MB min)
  fileSize: bigint;              // Total file size
  expiresAt: Date;               // Session expires (24h)
  createdAt: Date;               // Session created
  updatedAt: Date;               // Last update
};
```

**Lifecycle:**
```
PENDING → ACTIVE → COMPLETED
          ↘ EXPIRED ↗
          ↘ CANCELLED ↗
```

**Indexes:**
| Index | Use Case |
|-------|----------|
| uploadId (UNIQUE) | Find session by client's upload ID |
| recordingId | Get all sessions for a recording |
| userId | Query isolation / user's uploads |

---

## Enums

### LiveRecordingStatus
```
LOCAL_PENDING  → File saved locally, not uploaded yet
UPLOADING      → Upload in progress (chunks being received)
UPLOADED       → All chunks received and assembled
FAILED         → Upload failed, can be retried
PROCESSING     → Mux processing the video
READY          → Ready for playback
```

### RecordingSourceType
```
LIVE_RECORDING → Recovered from interrupted live stream
MANUAL_UPLOAD  → User manually selected file
```

### UploadSessionStatus
```
PENDING        → Session created, waiting for chunks
ACTIVE         → Actively receiving chunks
COMPLETED      → All chunks uploaded and assembled
EXPIRED        → Session timed out (>24h)
CANCELLED      → User cancelled
```

---

## API Contract

### Assumptions

1. **Authentication:**
   - All endpoints require valid JWT in `hb_live_session` cookie
   - User ID extracted as `session.sub` (Agent.id)
   - BUYER role rejected with 403

2. **Deduplication:**
   - Check `(userId, fileName, fileSize)` combination
   - If found + status READY|PROCESSING|UPLOADED → 409 conflict
   - If found + status FAILED → Reset and retry
   - If found + status PENDING|UPLOADING → Return active session (resume)

3. **Upload Sessions:**
   - Expire 24 hours after creation
   - Can be resumed if session still active and not expired
   - Deleted when recording is deleted (cascade)

4. **Storage:**
   - Chunks stored to `/tmp/uploads/{uploadSessionId}/chunk-{index}`
   - Final assembled to `/tmp/uploads/{uploadSessionId}/final.mp4`
   - In production, replace with S3/CDN URL

5. **Mux Integration:**
   - Asset created after upload completes
   - Mux webhooks update status asynchronously
   - playbackId available when status is "ready"

### Request/Response Examples

**POST /api/live-recordings/upload/init**
```json
// Request
{
  "streamId": "session_id",
  "propertyId": "prop_id",
  "fileName": "tour.mp4",
  "fileSize": 1024000,
  "mimeType": "video/mp4",
  "totalChunks": 100,
  "chunkSize": 5242880
}

// Response 201 (new)
{
  "data": {
    "recordingId": "rec_abc123",
    "uploadSessionId": "sess_xyz789",
    "uploadId": "uuid-...",
    "chunkSize": 5242880,
    "totalChunks": 100,
    "uploadedChunks": 0,
    "isResume": false,
    "expiresAt": "2026-05-07T12:00:00Z"
  }
}

// Response 200 (resume)
{
  "data": {
    "recordingId": "rec_abc123",
    "uploadSessionId": "sess_xyz789",
    "uploadId": "uuid-...",
    "chunkSize": 5242880,
    "totalChunks": 100,
    "uploadedChunks": 65,
    "isResume": true,
    "expiresAt": "2026-05-07T12:00:00Z"
  }
}

// Response 409 (conflict - already uploaded)
{
  "error": {
    "message": "A completed recording already exists for this file."
  }
}
```

**POST /api/live-recordings/upload/chunk**
```
Query: ?uploadSessionId={id}&chunkIndex={n}
Body: Binary chunk data (raw ArrayBuffer)

Response 200:
{
  "data": {
    "uploadSessionId": "sess_xyz789",
    "chunkIndex": 0,
    "uploadedChunks": 1,
    "totalChunks": 100,
    "isComplete": false
  }
}
```

**POST /api/live-recordings/upload/complete**
```json
// Request
{
  "uploadSessionId": "sess_xyz789",
  "createMuxAsset": true
}

// Response 200
{
  "data": {
    "recordingId": "rec_abc123",
    "uploadSessionId": "sess_xyz789",
    "status": "PROCESSING",
    "muxAssetId": "mux_asset_...",
    "playbackId": "playback_...",
    "storageUrl": "/tmp/uploads/sess_xyz789/final.mp4",
    "uploadedAt": "2026-05-06T12:00:00Z",
    "message": "Recording uploaded and queued for processing."
  }
}
```

**GET /api/live-recordings**
```json
// Response 200
{
  "data": [
    {
      "id": "rec_abc123",
      "fileName": "tour.mp4",
      "fileSize": 1024000,
      "mimeType": "video/mp4",
      "status": "READY",
      "uploadProgress": 100,
      "retryCount": 0,
      "muxAssetId": "mux_asset_...",
      "playbackId": "playback_...",
      "storageUrl": "/tmp/uploads/.../final.mp4",
      "uploadedAt": "2026-05-06T12:00:00Z",
      "createdAt": "2026-05-06T11:00:00Z",
      "streamId": "stream_123"
    }
  ]
}
```

---

## Query Patterns

### Find or Create with Deduplication

```ts
// Check for existing
const existing = await prisma.liveRecording.findFirst({
  where: {
    userId: session.sub,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
  },
});

if (existing) {
  if (['READY', 'PROCESSING', 'UPLOADED'].includes(existing.status)) {
    // 409 Conflict
  } else if (existing.status === 'FAILED') {
    // Reset for retry
    await prisma.liveRecording.update({
      where: { id: existing.id },
      data: {
        status: 'LOCAL_PENDING',
        retryCount: { increment: 1 },
        errorMessage: null,
      },
    });
  } else {
    // PENDING or UPLOADING - check for active session
    const activeSession = await prisma.uploadSession.findFirst({
      where: {
        recordingId: existing.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });
    // Return if found (resume)
  }
}

// Create if not found
const recording = await prisma.liveRecording.create({
  data: {
    userId: session.sub,
    fileName: payload.fileName,
    fileSize: payload.fileSize,
    // ...
  },
});
```

### Get Recording with Related Data

```ts
const recording = await prisma.liveRecording.findUnique({
  where: { id: recordingId },
  include: {
    uploadSessions: {
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  },
});
```

### List Agent's Recordings

```ts
const recordings = await prisma.liveRecording.findMany({
  where: {
    userId: session.sub,
  },
  orderBy: { createdAt: 'desc' },
  take: 50,
  select: {
    id: true,
    fileName: true,
    status: true,
    uploadProgress: true,
    playbackId: true,
    uploadedAt: true,
    createdAt: true,
  },
});
```

### Find Failed Uploads for Retry

```ts
const failed = await prisma.liveRecording.findMany({
  where: {
    userId: session.sub,
    status: 'FAILED',
    retryCount: { lt: 3 }, // Max 3 retries
  },
  orderBy: { updatedAt: 'asc' },
});
```

### Get Expired Sessions

```ts
const expired = await prisma.uploadSession.findMany({
  where: {
    status: 'ACTIVE',
    expiresAt: { lt: new Date() },
  },
  include: { recording: true },
});

// Then mark as expired
await Promise.all(
  expired.map(
    (session) =>
      prisma.uploadSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      })
  )
);
```

---

## Performance Optimization

### Indexes Strategy

| Index Type | Field(s) | Why |
|------------|---------|-----|
| Primary | id | Required |
| Single | userId | Filter by agent |
| Single | streamId | Find by session |
| Single | status | Filter by state |
| Single | muxAssetId | Mux webhook lookups |
| Composite | (userId, fileName, fileSize) | Deduplication check |
| Unique | uploadId | Lookup by client ID |

**Estimated index sizes** (1M records):
- Single field: ~50-100 MB
- Composite: ~100-150 MB
- Total: <500 MB

### Query Optimization

```ts
// ❌ Bad: SELECT *
const recording = await prisma.liveRecording.findUnique({
  where: { id },
});

// ✅ Good: Only needed fields
const recording = await prisma.liveRecording.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    playbackId: true,
    uploadedAt: true,
  },
});
```

### Connection Pooling

```env
DATABASE_URL="postgresql://user:pass@host/db?schema=public&connection_limit=20"
```

- Min: 2
- Standard: 10-20
- Max: 50 (adjust based on concurrency)

---

## Security Considerations

1. **Access Control:**
   - `userId` always from `session.sub` (server-side)
   - `recordingId` cannot be guessed (cuid is random)
   - `uploadId` is UUID (not sequential)

2. **Data Validation:**
   - `fileSize` max 10 GB (enforced in schema)
   - `mimeType` whitelist (video/* only)
   - `fileName` sanitized (no path traversal)

3. **Session Expiry:**
   - Sessions expire 24 hours after creation
   - Cannot upload to expired session
   - Prevents orphaned chunks

4. **Rate Limiting:**
   - Implement per-agent rate limit for init (max 1 per 10s)
   - Implement per-IP rate limit for chunk upload (max 100 MB/s)

---

## Monitoring & Alerts

### Metrics to Track

```sql
-- Recording status distribution
SELECT status, COUNT(*) as count
FROM "LiveRecording"
GROUP BY status;

-- Upload success rate (daily)
SELECT 
  DATE(created_at) as day,
  COUNT(*) as total,
  COUNT(CASE WHEN status IN ('READY', 'PROCESSING', 'UPLOADED') THEN 1 END) as success,
  ROUND(100.0 * COUNT(CASE WHEN status IN ('READY', 'PROCESSING', 'UPLOADED') THEN 1 END) / COUNT(*), 2) as pct
FROM "LiveRecording"
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Average file size
SELECT AVG(file_size / 1024 / 1024) as avg_mb
FROM "LiveRecording";

-- Retry distribution
SELECT retry_count, COUNT(*) as count
FROM "LiveRecording"
GROUP BY retry_count
ORDER BY retry_count DESC;
```

### Alerts

| Condition | Alert Level | Action |
|-----------|------------|--------|
| Failed recordings > 10% | Warning | Review error messages |
| Storage usage > 80% | Warning | Cleanup old files |
| Expired sessions > 1000 | Info | Run cleanup job |
| Average upload time > 30m | Warning | Check bandwidth |

---

## Cleanup Jobs

### Delete Expired Sessions (Run daily)

```ts
async function cleanupExpiredSessions() {
  const result = await prisma.uploadSession.deleteMany({
    where: {
      status: 'EXPIRED',
      expiresAt: { lt: new Date(Date.now() - 86400000) }, // 1 day old
    },
  });
  console.log(`Deleted ${result.count} expired sessions`);
}
```

### Delete Old Failed Recordings (Run weekly)

```ts
async function cleanupFailedRecordings() {
  const result = await prisma.liveRecording.deleteMany({
    where: {
      status: 'FAILED',
      retryCount: { gte: 5 }, // Give up after 5 retries
      updatedAt: { lt: new Date(Date.now() - 604800000) }, // 7 days old
    },
  });
  console.log(`Deleted ${result.count} failed recordings`);
}
```

### Cleanup Temp Files (Run every 6 hours)

```ts
async function cleanupTempFiles() {
  const sixHoursAgo = new Date(Date.now() - 21600000);
  
  const stale = await prisma.uploadSession.findMany({
    where: {
      status: { in: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
      updatedAt: { lt: sixHoursAgo },
    },
  });
  
  for (const session of stale) {
    // Delete /tmp/uploads/{uploadSessionId}
    // Use cleanup logic from upload routes
  }
}
```

---

## Deployment Checklist

- ✅ Database migrations applied (`prisma migrate deploy`)
- ✅ Prisma client generated (`npx prisma generate`)
- ✅ Environment variables set (DATABASE_URL, DIRECT_URL)
- ✅ Indexes verified (`psql \d LiveRecording`)
- ✅ Backup scheduled (daily)
- ✅ Monitoring configured (disk space, failed uploads)
- ✅ Cleanup jobs scheduled (expired sessions, old files)
- ✅ API routes tested (init, chunk, complete)
- ✅ Client app tested (upload page)
- ✅ Rollback plan documented

---

## References

- **Prisma Docs:** https://www.prisma.io/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Schema:** `RECORDING_UPLOAD_SCHEMA.md`
- **Migration:** `MIGRATION_GUIDE.md`
- **API Routes:** `src/app/api/live-recordings/upload/*`
- **Client:** `src/components/live/upload/*`
