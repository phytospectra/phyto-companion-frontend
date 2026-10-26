/**
 * Phytospectra API client.
 *
 * A thin typed wrapper over `fetch` for the backend orchestrator. Every
 * non-2xx response becomes a typed error — nothing is swallowed and no
 * response is returned on failure.
 *
 * Authentication: AuthProvider calls `setToken(idToken)` whenever Firebase
 * reports an auth-state change. The client never reads or persists the
 * token itself.
 */

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Base class for every error raised by the API client. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly url: string;

  constructor(
    message: string,
    status: number,
    body: unknown,
    url: string
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/** 401 — the request had no valid bearer token. */
export class UnauthorizedError extends ApiError {
  constructor(body: unknown, url: string) {
    super("Unauthorized — sign in and try again.", 401, body, url);
  }
}

/** 402 — the operation costs more tokens than the account holds. */
export class InsufficientTokensError extends ApiError {
  readonly balance: number;
  readonly required: number;
  readonly topup_url: string;

  constructor(
    body: { balance: number; required: number; topup_url: string },
    url: string
  ) {
    super("Insufficient tokens.", 402, body, url);
    this.balance = body.balance;
    this.required = body.required;
    this.topup_url = body.topup_url;
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends ApiError {
  constructor(body: unknown, url: string) {
    super("Not found.", 404, body, url);
  }
}

/** Field-level validation detail carried by a 422. */
export interface ValidationFieldError {
  field: string;
  message: string;
  code?: string;
}

/** 422 — the request failed server-side validation. */
export class ValidationError extends ApiError {
  readonly fields: ValidationFieldError[];

  constructor(fields: ValidationFieldError[], body: unknown, url: string) {
    super("Validation failed.", 422, body, url);
    this.fields = fields;
  }
}

/** 5xx — the server failed while handling the request. */
export class ServerError extends ApiError {
  constructor(status: number, body: unknown, url: string) {
    super("Server error — try again shortly.", status, body, url);
  }
}

/** 503 — the service is temporarily unavailable. */
export class ServiceUnavailableError extends ApiError {
  constructor(body: unknown, url: string) {
    super("Service temporarily unavailable.", 503, body, url);
  }
}

/** The request never reached the server (DNS, offline, CORS, abort). */
export class NetworkError extends ApiError {
  constructor(cause: unknown, url: string) {
    super(
      cause instanceof Error ? cause.message : "Network request failed.",
      0,
      cause,
      url
    );
  }
}

// ---------------------------------------------------------------------------
// Token plumbing
// ---------------------------------------------------------------------------

let idToken: string | null = null;

/** Called by AuthProvider on every Firebase auth-state change. */
export function setToken(token: string | null): void {
  idToken = token;
}

/** Read the current bearer token (exposed for tests/diagnostics). */
export function getToken(): string | null {
  return idToken;
}

/** Clear the token on sign-out. */
export function clearToken(): void {
  idToken = null;
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:8000";
  return "";
}

function generateIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // Fallback for environments without crypto.randomUUID.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseValidationFields(body: unknown): ValidationFieldError[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;

  // FastAPI style: { detail: [{ loc: ["body", "field"], msg, type }] }
  if (Array.isArray(record.detail)) {
    return record.detail.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const entry = item as Record<string, unknown>;
      const loc = Array.isArray(entry.loc) ? entry.loc : [];
      const field = loc.filter((l) => l !== "body").join(".");
      return [
        {
          field: field || "body",
          message: typeof entry.msg === "string" ? entry.msg : "Invalid value",
          code: typeof entry.type === "string" ? entry.type : undefined,
        },
      ];
    });
  }

  // { errors: { field: "message" | ["message"] } }
  if (record.errors && typeof record.errors === "object") {
    return Object.entries(record.errors as Record<string, unknown>).map(
      ([field, value]) => ({
        field,
        message: Array.isArray(value)
          ? String(value[0])
          : String(value),
      })
    );
  }

  return [];
}

function parseInsufficientTokens(
  body: unknown
): { balance: number; required: number; topup_url: string } {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const balance = Number(record.balance ?? 0);
  const required = Number(record.required ?? 0);
  const topup_url =
    typeof record.topup_url === "string" ? record.topup_url : "/billing";
  return {
    balance: Number.isFinite(balance) ? balance : 0,
    required: Number.isFinite(required) ? required : 0,
    topup_url,
  };
}

interface RequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  // Demo builds: no request may leave before the MSW service worker has
  // claimed the page, or it reaches the real orchestrator and 401s. The
  // check is inlined away entirely in non-mock builds.
  if (
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" &&
    typeof window !== "undefined"
  ) {
    const { whenMocksReady } = await import("@/mocks/init");
    await whenMocksReady();
  }

  const base = resolveBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method === "POST") {
    headers["Idempotency-Key"] =
      options.idempotencyKey ?? generateIdempotencyKey();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: options.signal,
    });
  } catch (cause) {
    throw new NetworkError(cause, url);
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (text === "") return undefined as T;
    return JSON.parse(text) as T;
  }

  const errorBody = await readBody(response);

  switch (response.status) {
    case 401:
      throw new UnauthorizedError(errorBody, url);
    case 402:
      throw new InsufficientTokensError(
        parseInsufficientTokens(errorBody),
        url
      );
    case 404:
      throw new NotFoundError(errorBody, url);
    case 422:
      throw new ValidationError(
        parseValidationFields(errorBody),
        errorBody,
        url
      );
    case 503:
      throw new ServiceUnavailableError(errorBody, url);
    default:
      if (response.status >= 500) {
        throw new ServerError(response.status, errorBody, url);
      }
      throw new ApiError(
        `Request failed with status ${response.status}.`,
        response.status,
        errorBody,
        url
      );
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(
    path: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<T>;
  del<T>(path: string, options?: RequestOptions): Promise<T>;
}

export const client: ApiClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("GET", path, undefined, options);
  },
  post<T>(
    path: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return request<T>("POST", path, body, options);
  },
  del<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>("DELETE", path, undefined, options);
  },
};

/** Singleton used by the app. */
export const apiClient = client;
export default client;

export { generateIdempotencyKey };
