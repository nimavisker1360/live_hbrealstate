export const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80";

export function getMuxThumbnailUrl(playbackId: string) {
  return `https://image.mux.com/${encodeURIComponent(
    playbackId,
  )}/thumbnail.jpg?time=0&width=1200&fit_mode=preserve`;
}

export function getLiveSessionPreviewImage({
  propertyImage,
  recordingPlaybackId,
  recordingStatus,
  status,
}: {
  propertyImage?: string | null;
  recordingPlaybackId?: string | null;
  recordingStatus?: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
}) {
  if (propertyImage) {
    return propertyImage;
  }

  if (
    status !== "LIVE" &&
    recordingStatus !== "deleted" &&
    recordingPlaybackId
  ) {
    return getMuxThumbnailUrl(recordingPlaybackId);
  }

  return propertyImage || FALLBACK_PROPERTY_IMAGE;
}

export function isInlineImageSrc(src: string) {
  return src.startsWith("data:image/") || src.startsWith("blob:");
}
