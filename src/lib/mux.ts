type MuxPlaybackId = {
  id: string;
  policy: "public" | "signed" | "drm";
};

type MuxLiveStreamData = {
  id: string;
  playback_ids?: MuxPlaybackId[];
  status?: string;
  stream_key: string;
};

type MuxApiResponse<T> = {
  data?: T;
  error?: {
    messages?: string[];
    message?: string;
    type?: string;
  };
};

export const MUX_RTMP_URL = "rtmp://global-live.mux.com:5222/app";

export class MuxConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MuxConfigurationError";
  }
}

export class MuxApiError extends Error {
  details?: unknown;
  status: number;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "MuxApiError";
    this.details = details;
    this.status = status;
  }
}

function getMuxCredentials() {
  const tokenId = process.env.MUX_TOKEN_ID?.trim();
  const tokenSecret = process.env.MUX_TOKEN_SECRET?.trim();

  if (!tokenId || !tokenSecret) {
    throw new MuxConfigurationError(
      "Mux credentials are missing. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET on the server.",
    );
  }

  return { tokenId, tokenSecret };
}

function mapMuxError(body: MuxApiResponse<unknown>, status: number) {
  return (
    body.error?.message ??
    body.error?.messages?.join(" ") ??
    `Mux request failed with status ${status}.`
  );
}

export async function createMuxLiveStream() {
  const { tokenId, tokenSecret } = getMuxCredentials();
  const authToken = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");
  const response = await fetch("https://api.mux.com/video/v1/live-streams", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playback_policies: ["public"],
      new_asset_settings: {
        playback_policies: ["public"],
      },
    }),
  });
  const body = (await response.json().catch(() => ({}))) as MuxApiResponse<
    MuxLiveStreamData
  >;

  if (!response.ok || !body.data) {
    throw new MuxApiError(
      mapMuxError(body, response.status),
      response.status,
      body.error,
    );
  }

  const playbackId = body.data.playback_ids?.find(
    (item) => item.policy === "public",
  )?.id;

  if (!playbackId) {
    throw new Error("Mux did not return a public playback ID.");
  }

  return {
    muxLiveStreamId: body.data.id,
    playbackId,
    rtmpUrl: MUX_RTMP_URL,
    status: body.data.status,
    streamKey: body.data.stream_key,
  };
}
