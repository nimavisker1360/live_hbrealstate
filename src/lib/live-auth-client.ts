export type SyncedLiveUser = {
  id: string;
  auth0Id: string;
  email: string | null;
  name: string;
  picture: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

export const LIVE_USER_KEY = "hb-live-user";
export const LIVE_USER_UPDATED_EVENT = "hb-live-user-updated";

export class LiveAuthSyncError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LiveAuthSyncError";
    this.status = status;
  }
}

export function isSyncedLiveUser(value: unknown): value is SyncedLiveUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "auth0Id" in value &&
    typeof (value as SyncedLiveUser).auth0Id === "string" &&
    "name" in value &&
    typeof (value as SyncedLiveUser).name === "string"
  );
}

export function readStoredLiveUser() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const storedUser = window.localStorage.getItem(LIVE_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser: unknown = JSON.parse(storedUser);

    return isSyncedLiveUser(parsedUser) ? parsedUser : null;
  } catch {
    return null;
  }
}

export function writeStoredLiveUser(user: SyncedLiveUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.localStorage.setItem(LIVE_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(LIVE_USER_KEY);
  }

  window.dispatchEvent(
    new CustomEvent<SyncedLiveUser | null>(LIVE_USER_UPDATED_EVENT, {
      detail: user,
    }),
  );
}

export async function syncLiveUserToken(token: string) {
  const response = await fetch("/api/auth/sync-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = body as ApiResponse<unknown>;

    throw new LiveAuthSyncError(
      errorBody.error?.message ?? "Could not sync user.",
      response.status,
    );
  }

  return body as SyncedLiveUser;
}
