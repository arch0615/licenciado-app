import { ApiError } from "../errors";
import { createHttpTransport, type TokenProvider } from "../http-transport";

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function setup(responses: (Response | Error)[], tokens: Partial<TokenProvider> = {}, onUnauthorized = jest.fn()) {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = queue.shift();
    if (!next) throw new Error("no more responses");
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof fetch;
  const getIdToken = jest.fn(tokens.getIdToken ?? (async (force?: boolean) => (force ? "fresh-token" : "token")));
  const transport = createHttpTransport({
    baseUrls: { auth: "https://auth.test", business: "https://api.test", rateio: "" },
    timeoutMs: 1000,
    retryDelayMs: 0,
    tokens: { getIdToken },
    onUnauthorized,
    clientHeaders: { "X-Client-Platform": "ios" },
    fetchImpl
  });
  const header = (call: Call | undefined, name: string) => (call?.init.headers as Record<string, string> | undefined)?.[name];
  return { transport, calls, getIdToken, onUnauthorized, header };
}

describe("http transport", () => {
  it("sends the Firebase ID token as Bearer and never cookies", async () => {
    const { transport, calls, header } = setup([jsonResponse(200, { ok: true })]);
    await expect(transport.request({ method: "GET", path: "/v1/auth/me" })).resolves.toEqual({ ok: true });
    expect(calls[0]?.url).toBe("https://api.test/v1/auth/me");
    expect(header(calls[0], "Authorization")).toBe("Bearer token");
    expect(header(calls[0], "Cookie")).toBeUndefined();
    expect(header(calls[0], "X-Client-Platform")).toBe("ios");
  });

  it("omits the token on public endpoints", async () => {
    const { transport, calls, getIdToken, header } = setup([jsonResponse(200, { valid: true })]);
    await transport.request({ method: "POST", path: "/v1/convites/validar", body: { token: "x" }, authenticated: false });
    expect(getIdToken).not.toHaveBeenCalled();
    expect(header(calls[0], "Authorization")).toBeUndefined();
    expect(header(calls[0], "Content-Type")).toBe("application/json");
    expect(calls[0]?.init.body).toBe(JSON.stringify({ token: "x" }));
  });

  it("refuses authenticated calls without a token (fail closed)", async () => {
    const { transport, calls } = setup([], { getIdToken: async () => null });
    await expect(transport.request({ method: "GET", path: "/v1/auth/me" })).rejects.toMatchObject({
      status: 401,
      code: "MISSING_TOKEN"
    });
    expect(calls).toHaveLength(0);
  });

  it("refreshes the token once on 401 and retries", async () => {
    const { transport, calls, header, onUnauthorized } = setup([jsonResponse(401, {}), jsonResponse(200, { ok: 1 })]);
    await expect(transport.request({ method: "GET", path: "/v1/x" })).resolves.toEqual({ ok: 1 });
    expect(header(calls[1], "Authorization")).toBe("Bearer fresh-token");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("signals the session when still 401 after refresh", async () => {
    const { transport, onUnauthorized } = setup([
      jsonResponse(401, {}),
      jsonResponse(401, { error: { code: "TOKEN_EXPIRED", message: "Sessão expirada", details: null } })
    ]);
    await expect(transport.request({ method: "GET", path: "/v1/x" })).rejects.toMatchObject({
      status: 401,
      code: "TOKEN_EXPIRED"
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("maps the backend error envelope and request id", async () => {
    const { transport } = setup([
      jsonResponse(
        422,
        { error: { code: "INVITATION_EXPIRED", message: "Este convite expirou.", details: { a: 1 } } },
        { "x-request-id": "req-1" }
      )
    ]);
    const error = await transport.request({ method: "POST", path: "/v1/x", body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "INVITATION_EXPIRED",
      message: "Este convite expirou.",
      details: { a: 1 },
      requestId: "req-1"
    });
  });

  it("uses a safe Portuguese message for non-JSON errors", async () => {
    const { transport } = setup([new Response("<html>bad gateway</html>", { status: 502 }), new Response("<html>bad gateway</html>", { status: 502 })]);
    const error = (await transport.request({ method: "GET", path: "/v1/x" }).catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe("HTTP_502");
    expect(error.message).not.toContain("html");
  });

  it("maps network failures", async () => {
    const { transport } = setup([new TypeError("Network request failed"), new TypeError("Network request failed")]);
    await expect(transport.request({ method: "GET", path: "/v1/x" })).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR"
    });
  });

  it("maps timeouts", async () => {
    jest.useFakeTimers();
    try {
      const fetchImpl = jest.fn(
        (_url: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          })
      ) as unknown as typeof fetch;
      const transport = createHttpTransport({
        baseUrls: { auth: "", business: "https://api.test", rateio: "" },
        getRetries: 0,
        timeoutMs: 1000,
        tokens: { getIdToken: async () => "token" },
        fetchImpl
      });
      const pending = transport.request({ method: "GET", path: "/v1/slow" });
      // Attach the assertion before advancing timers so the rejection is handled.
      const assertion = expect(pending).rejects.toMatchObject({ code: "TIMEOUT" });
      await jest.advanceTimersByTimeAsync(1001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it("serialises query strings and sends Idempotency-Key", async () => {
    const { transport, calls, header } = setup([jsonResponse(201, { id: "o1" })]);
    await transport.request({
      method: "POST",
      path: "/v1/pedidos",
      query: { page: 2, q: "maria silva", empty: "", none: undefined },
      body: { produto_id: "p1" },
      idempotencyKey: "checkout-123"
    });
    expect(calls[0]?.url).toBe("https://api.test/v1/pedidos?page=2&q=maria+silva");
    expect(header(calls[0], "Idempotency-Key")).toBe("checkout-123");
  });

  it("returns null for 204", async () => {
    const { transport } = setup([new Response(null, { status: 204 })]);
    await expect(transport.request({ method: "DELETE", path: "/v1/x" })).resolves.toBeNull();
  });

  it("fails closed when no base URL is configured", async () => {
    const transport = createHttpTransport({ baseUrls: { auth: "", business: "", rateio: "" }, timeoutMs: 1000, tokens: { getIdToken: async () => "t" } });
    await expect(transport.request({ method: "GET", path: "/v1/x" })).rejects.toMatchObject({ code: "API_NOT_CONFIGURED" });
  });

  it("routes requests to the base URL of their service", async () => {
    const { transport, calls } = setup([jsonResponse(200, {}), jsonResponse(200, {})]);
    await transport.request({ method: "GET", path: "/v1/auth/me", service: "auth" });
    await transport.request({ method: "GET", path: "/v1/licenciados/me" });
    expect(calls.map((call) => call.url)).toEqual(["https://auth.test/v1/auth/me", "https://api.test/v1/licenciados/me"]);
  });

  it("fails closed when the requested service is not configured", async () => {
    const { transport, calls } = setup([]);
    await expect(transport.request({ method: "GET", path: "/v1/x", service: "rateio" })).rejects.toMatchObject({
      code: "API_NOT_CONFIGURED"
    });
    expect(calls).toHaveLength(0);
  });

  it("retries a GET once after a network failure", async () => {
    const { transport, calls } = setup([new TypeError("Network request failed"), jsonResponse(200, { ok: true })]);
    await expect(transport.request({ method: "GET", path: "/v1/x" })).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("retries a GET once on 503", async () => {
    const { transport, calls } = setup([jsonResponse(503, {}), jsonResponse(200, { ok: true })]);
    await expect(transport.request({ method: "GET", path: "/v1/x" })).resolves.toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  it("never replays mutations", async () => {
    const { transport, calls } = setup([new TypeError("Network request failed")]);
    await expect(transport.request({ method: "POST", path: "/v1/x", body: {} })).rejects.toMatchObject({
      code: "NETWORK_ERROR"
    });
    expect(calls).toHaveLength(1);
  });

  it("maps the legacy { message } envelope", async () => {
    const { transport } = setup([jsonResponse(400, { message: "CPF inválido." })]);
    await expect(transport.request({ method: "POST", path: "/v1/x", body: {} })).rejects.toMatchObject({
      status: 400,
      code: "HTTP_400",
      message: "CPF inválido."
    });
  });

  it("hides server messages on 5xx", async () => {
    const { transport } = setup([jsonResponse(500, { message: "relation users does not exist" })]);
    const error = (await transport.request({ method: "POST", path: "/v1/x", body: {} }).catch((e: unknown) => e)) as ApiError;
    expect(error.message).not.toContain("relation");
  });

  it("sends FormData bodies as multipart (no JSON content type)", async () => {
    const { transport, calls, header } = setup([jsonResponse(201, { id: "d1" })]);
    const form = new FormData();
    form.append("tipo", "RG");
    await transport.request({ method: "POST", path: "/v1/documentos", body: form });
    expect(header(calls[0], "Content-Type")).toBeUndefined();
    expect(calls[0]?.init.body).toBe(form);
  });
});
