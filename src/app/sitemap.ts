import type { MetadataRoute } from "next";
import { FALLBACK_PROPERTY_IMAGE } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const reels = await prisma.liveSession.findMany({
    where: { recordingPlaybackId: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 5000,
    select: {
      property: { select: { image: true, location: true, title: true } },
      roomId: true,
      title: true,
      updatedAt: true,
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
      url: `${siteUrl}/reels`,
    },
    ...reels.map((reel) => {
      const property = reel.property;
      const title = reel.title ?? property.title;
      const thumbnail = property?.image || FALLBACK_PROPERTY_IMAGE;

      return {
        changeFrequency: "weekly" as const,
        lastModified: reel.updatedAt,
        priority: 0.7,
        url: `${siteUrl}/reels/${reel.roomId}`,
        videos: [
          {
            description: property
              ? `HB Property Reels video for ${property.title} in ${property.location}.`
              : `HB Property Reels video for ${title}.`,
            thumbnail_loc: absoluteUrl(thumbnail),
            title,
          },
        ],
      };
    }),
  ];
}
