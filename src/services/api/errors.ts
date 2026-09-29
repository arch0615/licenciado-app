/**
 * Error thrown by every API call (HTTP or mock). Mirrors the backend envelope
 * `{ "error": { "code", "message", "details" } }` — see licenciado-api README.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(params: { status: number; code: string; message: string; details?: unknown; requestId?: string | null }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details ?? null;
    this.requestId = params.requestId ?? null;
  }

  get isNetwork(): boolean {
    return this.code === "NETWORK_ERROR" || this.code === "TIMEOUT";
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

const GENERIC_MESSAGES: Record<number, string> = {
  0: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Não encontramos o que você procura.",
  409: "Esta ação entrou em conflito com uma alteração recente.",
  422: "Não foi possível concluir esta ação.",
  429: "Muitas tentativas. Aguarde um instante e tente novamente.",
  500: "Algo deu errado do nosso lado. Tente novamente em instantes.",
  503: "Serviço temporariamente indisponível. Tente novamente em instantes."
};

/**
 * Builds an ApiError from a non-2xx response body (tolerates non-JSON bodies).
 * Accepts the licenciado-api envelope `{ error: { code, message, details } }` and the legacy
 * ACVEL envelope `{ message | error | detail }` still returned by older business services.
 */
export function apiErrorFromResponse(status: number, body: unknown, requestId: string | null): ApiError {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : undefined;
  const envelope =
    record && typeof record.error === "object" && record.error !== null
      ? (record.error as { code?: unknown; message?: unknown; details?: unknown })
      : undefined;
  const legacyMessage = [record?.message, typeof record?.error === "string" ? record.error : undefined, record?.detail].find(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  const code =
    typeof envelope?.code === "string" ? envelope.code : typeof record?.code === "string" ? record.code : `HTTP_${status}`;
  const serverMessage =
    typeof envelope?.message === "string" && envelope.message.length > 0 ? envelope.message : legacyMessage;
  // 5xx messages may leak internals: always show the generic text for those.
  const message =
    status < 500 && serverMessage ? serverMessage : GENERIC_MESSAGES[status] ?? GENERIC_MESSAGES[status >= 500 ? 500 : 422]!;
  return new ApiError({ status, code, message, details: envelope?.details ?? record?.details ?? null, requestId });
}

export function networkError(kind: "NETWORK_ERROR" | "TIMEOUT"): ApiError {
  return new ApiError({
    status: 0,
    code: kind,
    message: kind === "TIMEOUT" ? "A conexão demorou demais. Tente novamente." : GENERIC_MESSAGES[0]!
  });
}

/** Safe user-facing message for any thrown value. */
export function userMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return "Algo deu errado. Tente novamente.";
}
