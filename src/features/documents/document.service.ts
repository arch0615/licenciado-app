import { ApiError } from "@/services/api/errors";
import { toPage } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/** Inventory §9 D1–D5 (business service, not in Swagger). */
export type DocumentOwner =
  | { proprietario_tipo: "LICENCIADO"; licenciado_id: string }
  | { proprietario_tipo: "SUBLICENCIADO"; sublicenciado_id: string }
  | { proprietario_tipo: "CONSUMIDOR"; consumidor_id: string };

export type DocumentType = "RG" | "CNH" | "CNPJ" | "FATURA_ENERGIA";

export type DocumentItem = {
  id: string;
  tipo: DocumentType | string;
  status_validacao: "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REPROVADO" | string;
  reprovado_motivo: string | null;
  created_at: string;
  arquivo_nome: string | null;
};

export type PickedFile = { uri: string; name: string; size: number; mimeType: string };

type PresignedUpload = { upload_url: string; upload_method: "PUT"; arquivo_path: string; expires_at: string };

/** Size limits from the inventory (image 6 MB, PDF 12 MB). The backend re-validates. */
const MAX_BYTES = { image: 6 * 1024 * 1024, pdf: 12 * 1024 * 1024 };

export function validatePickedFile(file: PickedFile): string | null {
  const isPdf = file.mimeType === "application/pdf";
  const isImage = file.mimeType.startsWith("image/");
  if (!isPdf && !isImage) return "Envie uma foto ou um PDF.";
  if (file.size > (isPdf ? MAX_BYTES.pdf : MAX_BYTES.image)) return isPdf ? "O PDF deve ter até 12 MB." : "A imagem deve ter até 6 MB.";
  return null;
}

/**
 * Owner ids here come from GET /v1/auth/me (server-resolved). The backend must still verify them
 * against the token (inventory D1: "ignore query owner ids for non-admins").
 */
export async function listDocuments(api: ApiClient, owner: DocumentOwner): Promise<DocumentItem[]> {
  const body = await api.get<unknown>("/v1/documentos", { query: { ...owner, page: 1, per_page: 50 } });
  return toPage<DocumentItem>(body).items;
}

/**
 * Upload pipeline: presign (D2) → PUT bytes → confirm (D4), or reenviar (D5) for a rejected document.
 * - Absolute presigned URLs (object storage) receive the file WITHOUT the Firebase token.
 * - Relative URLs (backend local-storage driver) go through the API client (Bearer).
 * The checksum is not sent: the inventory requires the backend to compute it from the stored object.
 */
export async function uploadDocument(
  api: ApiClient,
  owner: DocumentOwner,
  tipo: DocumentType,
  file: PickedFile,
  options: { replaceDocumentId?: string; fetchImpl?: typeof fetch } = {}
): Promise<DocumentItem> {
  const invalid = validatePickedFile(file);
  if (invalid) throw new ApiError({ status: 422, code: "INVALID_FILE", message: invalid });

  const metadata = { arquivo_nome: file.name, arquivo_tamanho: file.size, arquivo_mime_type: file.mimeType };
  const presigned = await api.post<PresignedUpload>("/v1/documentos/presign-upload", { ...owner, tipo, ...metadata });

  const fetchImpl = options.fetchImpl ?? fetch;
  const blob = await (await fetchImpl(file.uri)).blob();
  if (presigned.upload_url.startsWith("/")) {
    await api.put(presigned.upload_url, blob, { contentType: file.mimeType });
  } else if (presigned.upload_url.startsWith("https://")) {
    const response = await fetchImpl(presigned.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.mimeType },
      body: blob
    });
    if (!response.ok) throw new ApiError({ status: response.status, code: "UPLOAD_FAILED", message: "Não foi possível enviar o arquivo." });
  } else {
    throw new ApiError({ status: 0, code: "UPLOAD_URL_REJECTED", message: "Não foi possível enviar o arquivo." });
  }

  if (options.replaceDocumentId) {
    return api.post<DocumentItem>(`/v1/documentos/${encodeURIComponent(options.replaceDocumentId)}/reenviar`, {
      arquivo_path: presigned.arquivo_path,
      ...metadata
    });
  }
  return api.post<DocumentItem>("/v1/documentos/confirm-upload", {
    ...owner,
    tipo,
    ...metadata,
    arquivo_path: presigned.arquivo_path,
    descricao: `Upload ${tipo}`
  });
}
