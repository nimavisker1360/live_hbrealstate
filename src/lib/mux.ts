type MuxPlaybackId = {
  id: string;
  policy: "public" | "signed" | "drm";
};

type MuxLiveStreamData = {
  active_asset_id?: string;
  id: string;
  playback_ids?: MuxPlaybackId[];
  recent_asset_ids?: string[];
  status?: string;
  stream_key: string;
};

type MuxAssetData = {
  id: string;
  live_stream_id?: string;
  playback_ids?: MuxPlaybackId[];
  status?: string;
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

function getMuxAuthHeader() {
  const { tokenId, tokenSecret } = getMuxCredentials();
  const authToken = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");

  return `Basic ${authToken}`;
}

function mapMuxError(body: MuxApiResponse<unknown>, status: number) {
  return (
    body.error?.message ??
    body.error?.messages?.join(" ") ??
    `Mux request failed with status ${status}.`
  );
}

export async function createMuxLiveStream() {
  const response = await fetch("https://api.mux.com/video/v1/live-streams", {
    method: "POST",
    headers: {
      Authorization: getMuxAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playback_policies: ["public"],
      latency_mode: "low",
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

export async function getMuxLiveStream(muxLiveStreamId: string) {
  const response = await fetch(
    `https://api.mux.com/video/v1/live-streams/${encodeURIComponent(
      muxLiveStreamId,
    )}`,
    {
      headers: {
        Authorization: getMuxAuthHeader(),
      },
    },
  );
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

  const playbackId =
    body.data.playback_ids?.find((item) => item.policy === "public")?.id ??
    body.data.playback_ids?.[0]?.id ??
    null;

  return {
    activeAssetId: body.data.active_asset_id ?? null,
    muxLiveStreamId: body.data.id,
    playbackId,
    recentAssetIds: body.data.recent_asset_ids ?? [],
    status: body.data.status ?? null,
  };
}

export async function getMuxAsset(muxAssetId: string) {
  const response = await fetch(
    `https://api.mux.com/video/v1/assets/${encodeURIComponent(muxAssetId)}`,
    {
      headers: {
        Authorization: getMuxAuthHeader(),
      },
    },
  );
  const body = (await response.json().catch(() => ({}))) as MuxApiResponse<
    MuxAssetData
  >;

  if (!response.ok || !body.data) {
    throw new MuxApiError(
      mapMuxError(body, response.status),
      response.status,
      body.error,
    );
  }

  const playbackId =
    body.data.playback_ids?.find((item) => item.policy === "public")?.id ??
    body.data.playback_ids?.[0]?.id ??
    null;

  return {
    liveStreamId: body.data.live_stream_id ?? null,
    muxAssetId: body.data.id,
    playbackId,
    status: body.data.status ?? null,
  };
}
