import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ReelViewer } from "@/components/reels/ReelViewer";
import { getCurrentSession } from "@/lib/auth";
import { getConsultantByAgent } from "@/lib/hb-consultants";
import { FALLBACK_PROPERTY_IMAGE, isInlineImageSrc } from "@/lib/live-media";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

const SITE_NAME = "HB Property Reels";
const PUBLISHER_NAME = "HB Real Estate";

type ReelPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(
  price: { toString(): string } | null | undefined,
  currency: string,
) {
  if (!price) {
    return "Price on request";
  }

  const amount = Number(price.toString());

  if (!Number.isFinite(amount)) {
    return `${currency} ${price.toString()}`;
  }

  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function truncate(input: string, max = 160) {
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trimEnd()}...`;
}

function getPublicAssetUrl(value: string | null | undefined) {
  const source = value && !isInlineImageSrc(value) ? value : FALLBACK_PROPERTY_IMAGE;

  return absoluteUrl(source);
}

const getVideoTour = cache((slug: string) =>
  prisma.videoTour.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      blobUrl: true,
      thumbnailUrl: true,
      mimeType: true,
      durationSeconds: true,
      width: true,
      height: true,
      likeCount: true,
      commentCount: true,
      viewCount: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      agent: { select: { id: true, name: true } },
      property: {
        select: {
          id: true,
          title: true,
          location: true,
          price: true,
          currency: true,
          image: true,
        },
      },
    },
  }),
);

function toIsoDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return undefined;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  let out = "PT";
  if (h) out += `${h}H`;
  if (m) out += `${m}M`;
  if (s || (!h && !m)) out += `${s}S`;
  return out;
}

function buildSeoTitle({
  location,
  title,
}: {
  location: string;
  title: string;
}) {
  return truncate(`${title} in ${location} | HB Reels`, 60);
}

function buildSeoDescription({
  agentName,
  description,
  location,
  priceLabel,
  propertyTitle,
}: {
  agentName: string;
  description: string | null;
  location: string;
  priceLabel: string;
  propertyTitle: string;
}) {
  if (description?.trim()) {
    return truncate(`${description.trim()} ${priceLabel} in ${location}.`, 155);
  }

  return truncate(
    `Watch a mobile property reel for ${propertyTitle} in ${location}. ${priceLabel}. Contact ${agentName} through HB Real Estate.`,
    155,
  );
}

function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateMetadata({
  params,
}: ReelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const reel = await getVideoTour(slug);

  if (!reel) {
    return {
      title: "Reel not found | HB Property Reels",
      robots: { index: false, follow: false },
    };
  }

  const isPublished = reel.status === "PUBLISHED";
  const propertyTitle = reel.property.title;
  const location = reel.property.location;
  const agentName = reel.agent.name;
  const priceLabel = formatPrice(reel.property.price, reel.property.currency);
  const canonicalUrl = absoluteUrl(`/reels/${slug}`);
  const imageUrl = getPublicAssetUrl(reel.thumbnailUrl ?? reel.property.image);
  const videoUrl = absoluteUrl(reel.blobUrl);

  const title = buildSeoTitle({ location, title: reel.title || propertyTitle });
  const description = buildSeoDescription({
    agentName,
    description: reel.description,
    location,
    priceLabel,
    propertyTitle,
  });

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    applicationName: SITE_NAME,
    alternates: { canonical: canonicalUrl },
    category: "Real Estate",
    formatDetection: { telephone: false },
    robots: isPublished
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-video-preview": -1,
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false, noimageindex: true },
        },
    openGraph: {
      title,
      description,
      type: "video.other",
      url: canonicalUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          alt: `${propertyTitle} property reel in ${location}`,
          width: reel.width ?? 1200,
          height: reel.height ?? 630,
        },
      ],
      videos: [
        {
          url: videoUrl,
          type: reel.mimeType ?? "video/mp4",
          width: reel.width ?? undefined,
          height: reel.height ?? undefined,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: imageUrl, alt: `${propertyTitle} property reel` }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default async function ReelPage({ params }: ReelPageProps) {
  const { slug } = await params;
  const [reel, session] = await Promise.all([
    getVideoTour(slug),
    getCurrentSession().catch(() => null),
  ]);

  if (!reel) {
    notFound();
  }

  const consultant = getConsultantByAgent(reel.agent);
  const poster = reel.thumbnailUrl ?? reel.property.image ?? FALLBACK_PROPERTY_IMAGE;
  const isProcessing = reel.status === "PROCESSING" || reel.status === "DRAFT";
  const isPublished = reel.status === "PUBLISHED";

  const canonicalUrl = absoluteUrl(`/reels/${slug}`);
  const posterUrl = getPublicAssetUrl(poster);
  const videoUrl = absoluteUrl(reel.blobUrl);
  const duration = toIsoDuration(reel.durationSeconds);
  const price = reel.property.price?.toString();
  const videoObjectLd = isPublished
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: reel.title || reel.property.title,
        description:
          reel.description?.trim() ||
          `Property tour of ${reel.property.title} in ${reel.property.location} with ${reel.agent.name}.`,
        thumbnailUrl: [posterUrl],
        uploadDate: (reel.publishedAt ?? reel.createdAt).toISOString(),
        dateModified: reel.updatedAt.toISOString(),
        contentUrl: videoUrl,
        embedUrl: canonicalUrl,
        ...(duration ? { duration } : {}),
        width: reel.width ?? undefined,
        height: reel.height ?? undefined,
        encodingFormat: reel.mimeType ?? "video/mp4",
        inLanguage: "en-US",
        isFamilyFriendly: true,
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: reel.viewCount,
          },
          {
            "@type": "InteractionCounter",
            interactionType: { "@type": "LikeAction" },
            userInteractionCount: reel.likeCount,
          },
          {
            "@type": "InteractionCounter",
            interactionType: { "@type": "CommentAction" },
            userInteractionCount: reel.commentCount,
          },
        ],
        creator: { "@type": "Person", name: reel.agent.name },
        publisher: {
          "@type": "Organization",
          name: PUBLISHER_NAME,
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        about: {
          "@type": "RealEstateListing",
          name: reel.property.title,
          url: canonicalUrl,
          image: getPublicAssetUrl(reel.property.image ?? poster),
          address: reel.property.location,
          ...(price
            ? {
                offers: {
                  "@type": "Offer",
                  price,
                  priceCurrency: reel.property.currency,
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        },
      }
    : null;

  return (
    <>
      {videoObjectLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(videoObjectLd) }}
        />
      ) : null}
      <ReelViewer
        reel={{
          id: reel.id,
          slug: reel.slug,
          title: reel.title,
          description: reel.description,
          videoUrl: reel.blobUrl,
          mimeType: reel.mimeType ?? "video/mp4",
          poster,
          isProcessing,
          isAuthenticated: Boolean(session?.sub),
          likeCount: reel.likeCount,
          commentCount: reel.commentCount,
          viewCount: reel.viewCount,
          property: {
            id: reel.property.id,
            title: reel.property.title,
            location: reel.property.location,
            price: formatPrice(reel.property.price, reel.property.currency),
          },
          agent: {
            id: reel.agent.id,
            name: reel.agent.name,
            image: consultant?.image,
            phone: consultant?.phone,
            whatsapp: consultant?.whatsapp,
            specialty: consultant?.specialty,
          },
        }}
      />
    </>
  );
}
