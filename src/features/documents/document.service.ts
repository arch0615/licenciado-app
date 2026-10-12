import * as Crypto from "expo-crypto";

import { ApiError } from "@/services/api/errors";
import { toPage } from "@/services/api/pagination";
import type { ApiClient } from "@/services/api/types";

/**
 * Documents (portal parity: /perfil documents, /clientes/[id]?tab=documentos, /equipe preview, onboarding
 * uploads). Live ACVEL business API. Internal storage paths (`arquivo_path`) are only used inside the
 * upload pipeline and are never exposed to the UI.
 */
export type DocumentOwner =
  | { proprietario_tipo: "LICENCIADO"; licenciado_id: string }
  | { proprietario_tipo: "SUBLICENCIADO"; sublicenciado_id: string }
  | { proprietario_tipo: "CONSUMIDOR"; consumidor_id: string };

/** Types the onboarding flows upload (live enum is larger; these are the ones the portal uses). */
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

/** Size limits used by the portal (image 6 MB, PDF 12 MB). The backend re-validates. */
const MAX_BYTES = { image: 6 * 1024 * 1024, pdf: 12 * 1024 * 1024 };

export function validatePickedFile(file: PickedFile): string | null {
  const isPdf = file.mimeType === "application/pdf";
  const isImage = file.mimeType.startsWith("image/");
  if (!isPdf && !isImage) return "Envie uma foto ou um PDF.";
  if (file.size > (isPdf ? MAX_BYTES.pdf : MAX_BYTES.image)) return isPdf ? "O PDF deve ter até 12 MB." : "A imagem deve ter até 6 MB.";
  return null;
}

/** Strips any field the UI must not see (e.g. storage paths) from a live document record. */
function toDocumentItem(raw: Record<string, unknown>): DocumentItem {
  return {
    id: String(raw.id),
    tipo: String(raw.tipo ?? ""),
    status_validacao: String(raw.status_validacao ?? ""),
    reprovado_motivo: typeof raw.reprovado_motivo === "string" ? raw.reprovado_motivo : null,
    created_at: String(raw.created_at ?? ""),
    arquivo_nome: typeof raw.arquivo_nome === "string" ? raw.arquivo_nome : null
  };
}

/**
 * Owner ids come from GET /v1/auth/me / the business record (server-resolved) or from a client the backend
 * already returned. The backend must still verify them against the token.
 */
export async function listDocuments(api: ApiClient, owner: DocumentOwner): Promise<DocumentItem[]> {
  const body = await api.get<unknown>("/v1/documentos", { query: { ...owner, page: 1, per_page: 50 } });
  return toPage<Record<string, unknown>>(body).items.map(toDocumentItem);
}

/**
 * Short-lived URL to view/download a document (`GET /v1/documentos/{id}/signed-url`).
 * Only absolute https URLs are returned to the UI, so a link is never built from a relative/internal path.
 */
export async function getDocumentViewUrl(api: ApiClient, documentId: string): Promise<string | null> {
  const body = await api.get<{ signed_url?: unknown; url?: unknown }>(`/v1/documentos/${encodeURIComponent(documentId)}/signed-url`);
  const url = typeof body?.signed_url === "string" ? body.signed_url : typeof body?.url === "string" ? body.url : null;
  return url && url.startsWith("https://") ? url : null;
}

/** SHA-256 (hex) of the file bytes, required by the live API as `arquivo_checksum`. */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload pipeline used by the portal onboarding: presign → PUT bytes → confirm, or `reenviar` for a
 * rejected document. Absolute presigned URLs receive the file WITHOUT the Firebase token; relative URLs
 * go through the API client. Non-https absolute URLs are refused.
 */
export async function uploadDocument(
  api: ApiClient,
  owner: DocumentOwner,
  tipo: DocumentType,
  file: PickedFile,
  options: { replaceDocumentId?: string; fetchImpl?: typeof fetch; hash?: (bytes: ArrayBuffer) => Promise<string> } = {}
): Promise<DocumentItem> {
  const invalid = validatePickedFile(file);
  if (invalid) throw new ApiError({ status: 422, code: "INVALID_FILE", message: invalid });

  const fetchImpl = options.fetchImpl ?? fetch;
  // Read the local file twice: React Native cannot build a Blob from an ArrayBuffer.
  const checksum = await (options.hash ?? sha256Hex)(await (await fetchImpl(file.uri)).arrayBuffer());
  const metadata = {
    arquivo_nome: file.name,
    arquivo_tamanho: file.size,
    arquivo_mime_type: file.mimeType,
    arquivo_checksum: checksum
  };
  const presigned = await api.post<PresignedUpload>("/v1/documentos/presign-upload", { ...owner, tipo, ...metadata });

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
    return toDocumentItem(
      await api.post<Record<string, unknown>>(`/v1/documentos/${encodeURIComponent(options.replaceDocumentId)}/reenviar`, {
        arquivo_path: presigned.arquivo_path,
        ...metadata
      })
    );
  }
  return toDocumentItem(
    await api.post<Record<string, unknown>>("/v1/documentos/confirm-upload", {
      ...owner,
      tipo,
      ...metadata,
      arquivo_path: presigned.arquivo_path,
      descricao: `Upload ${tipo}`
    })
  );
}
