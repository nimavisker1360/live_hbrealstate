import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with test recording data...");

  // Create or find test agent
  const agent = await prisma.agent.upsert({
    where: { id: "agent-test-recovery" },
    update: {},
    create: {
      id: "agent-test-recovery",
      name: "Test Agent",
      company: "HB Real Estate",
      status: "ACTIVE",
      subscriptionPlan: "PRO",
    },
  });

  // Create or find test property
  const property = await prisma.property.upsert({
    where: { id: "property-test-recovery" },
    update: {},
    create: {
      id: "property-test-recovery",
      agentId: agent.id,
      title: "Modern Penthouse Downtown",
      location: "Istanbul, Turkey",
      price: "5000000",
      currency: "USD",
      description: "Luxury penthouse with city views",
      image:
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80",
    },
  });

  // Create test recordings in various states
  const recordings = await Promise.all([
    // Pending upload
    prisma.liveRecording.upsert({
      where: { id: "rec-pending-1" },
      update: {},
      create: {
        id: "rec-pending-1",
        userId: agent.id,
        propertyId: property.id,
        fileName: "property-tour-morning.mp4",
        fileSize: BigInt(524288000), // 500 MB
        mimeType: "video/mp4",
        title: "Penthouse Tour - Morning Lighting",
        status: "LOCAL_PENDING",
        sourceType: "LIVE_RECORDING",
        uploadProgress: 0,
        retryCount: 0,
      },
    }),

    // Failed upload (can retry)
    prisma.liveRecording.upsert({
      where: { id: "rec-failed-1" },
      update: {},
      create: {
        id: "rec-failed-1",
        userId: agent.id,
        propertyId: property.id,
        fileName: "stream-backup.mp4",
        fileSize: BigInt(314572800), // 300 MB
        mimeType: "video/mp4",
        title: "Stream Backup - Interrupted",
        status: "FAILED",
        sourceType: "LIVE_RECORDING",
        uploadProgress: 65,
        retryCount: 2,
        errorMessage: "Network timeout at chunk 65/100",
      },
    }),

    // Uploaded and processing
    prisma.liveRecording.upsert({
      where: { id: "rec-processing-1" },
      update: {},
      create: {
        id: "rec-processing-1",
        userId: agent.id,
        propertyId: property.id,
        fileName: "interior-walkthrough.mp4",
        fileSize: BigInt(734003200), // 700 MB
        mimeType: "video/mp4",
        title: "Interior Walkthrough",
        status: "PROCESSING",
        sourceType: "LIVE_RECORDING",
        uploadProgress: 100,
        uploadedAt: new Date(Date.now() - 3600000), // 1 hour ago
        retryCount: 0,
        muxAssetId: "mux-asset-abc123",
      },
    }),

    // Ready for playback
    prisma.liveRecording.upsert({
      where: { id: "rec-ready-1" },
      update: {},
      create: {
        id: "rec-ready-1",
        userId: agent.id,
        propertyId: property.id,
        fileName: "rooftop-views.mp4",
        fileSize: BigInt(419430400), // 400 MB
        mimeType: "video/mp4",
        title: "Rooftop Views & Sunset",
        status: "READY",
        sourceType: "LIVE_RECORDING",
        uploadProgress: 100,
        uploadedAt: new Date(Date.now() - 86400000), // 1 day ago
        retryCount: 0,
        muxAssetId: "mux-asset-xyz789",
        playbackId: "playback-id-ready-1",
      },
    }),
  ]);

  console.log("Created test recordings:");
  recordings.forEach((rec) => {
    console.log(`  - ${rec.fileName} (${rec.status})`);
  });

  // Create test upload session (active)
  const uploadSession = await prisma.uploadSession.create({
    data: {
      recordingId: "rec-failed-1",
      userId: agent.id,
      uploadId: "upload-session-test-1",
      status: "ACTIVE",
      totalChunks: 100,
      uploadedChunks: 65,
      chunkSize: 5242880, // 5 MB
      fileSize: BigInt(314572800),
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
    },
  });

  console.log(`\nCreated test upload session: ${uploadSession.uploadId}`);
  console.log(`  Progress: ${uploadSession.uploadedChunks}/${uploadSession.totalChunks} chunks`);

  console.log("\n✓ Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
