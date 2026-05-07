import type { MetadataRoute } from "next";
import { LiveRecordingStatus } from "@/generated/prisma/client";
import { FALLBACK_PROPERTY_IMAGE, getMuxThumbnailUrl } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const recordings = await prisma.liveRecording.findMany({
    where: {
      status: {
        in: [LiveRecordingStatus.READY, LiveRecordingStatus.UPLOADED],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 5000,
    include: {
      property: { select: { image: true, location: true, title: true } },
      stream: {
        select: {
          property: { select: { image: true, location: true, title: true } },
          title: true,
        },
      },
    },
  });

  return [
    {
      changeFrequency: "daily",
      lastModified: new Date(),
      priority: 1,
      url: siteUrl,
    },
    {
      changeFrequency: "hourly",
      lastModified: new Date(),
      priority: 0.9,
      url: `${siteUrl}/live`,
    },
    ...recordings.map((recording) => {
      const property = recording.property ?? recording.stream?.property;
      const title =
        recording.title ??
        recording.stream?.title ??
        property?.title ??
        recording.fileName;
      const thumbnail = recording.playbackId
        ? getMuxThumbnailUrl(recording.playbackId)
        : property?.image || FALLBACK_PROPERTY_IMAGE;

      return {
        changeFrequency: "weekly" as const,
        lastModified: recording.updatedAt,
        priority: 0.7,
        url: `${siteUrl}/live/replay/${recording.id}`,
        videos: [
          {
            description: property
              ? `HB Live replay for ${property.title} in ${property.location}.`
              : `HB Live replay for ${title}.`,
            thumbnail_loc: absoluteUrl(thumbnail),
            title,
          },
        ],
      };
    }),
  ];
}
