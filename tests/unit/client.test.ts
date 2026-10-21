import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import {
  apiClient,
  setToken,
  clearToken,
  UnauthorizedError,
  InsufficientTokensError,
} from "@/api/client";

describe("api client", () => {
  beforeEach(() => {
    clearToken();
  });

  it("adds the Authorization bearer header when a token is set", async () => {
    let seen: string | null = null;
    server.use(
      http.get("http://localhost:8000/echo-auth", ({ request }) => {
        seen = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    setToken("test-id-token");
    await apiClient.get("/echo-auth");

    expect(seen).toBe("Bearer test-id-token");
  });

  it("throws UnauthorizedError on a 401 response", async () => {
    server.use(
      http.get("http://localhost:8000/protected", () =>
        HttpResponse.json({ detail: "no token" }, { status: 401 })
      )
    );

    await expect(apiClient.get("/protected")).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("throws InsufficientTokensError carrying the 402 body", async () => {
    server.use(
      http.post("http://localhost:8000/metered", () =>
        HttpResponse.json(
          { detail: "Insufficient tokens", balance: 3, required: 10, topup_url: "/billing" },
          { status: 402 }
        )
      )
    );

    setToken("tok");
    const error = await apiClient
      .post("/metered", {})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InsufficientTokensError);
    const typed = error as InsufficientTokensError;
    expect(typed.balance).toBe(3);
    expect(typed.required).toBe(10);
    expect(typed.topup_url).toBe("/billing");
  });

  it("sends an Idempotency-Key header on POST", async () => {
    let seen: string | null = null;
    server.use(
      http.post("http://localhost:8000/idem", ({ request }) => {
        seen = request.headers.get("Idempotency-Key");
        return HttpResponse.json({ ok: true });
      })
    );

    setToken("tok");
    await apiClient.post("/idem", { value: 1 }, { idempotencyKey: "key-123" });

    expect(seen).toBe("key-123");
  });
});
