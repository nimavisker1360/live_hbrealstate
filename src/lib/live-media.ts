export const FALLBACK_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=80";

export function getLiveSessionPreviewImage({
  propertyImage,
}: {
  propertyImage?: string | null;
}) {
  if (propertyImage) {
    return propertyImage;
  }

  return propertyImage || FALLBACK_PROPERTY_IMAGE;
}

export function isInlineImageSrc(src: string) {
  return src.startsWith("data:image/") || src.startsWith("blob:");
}
