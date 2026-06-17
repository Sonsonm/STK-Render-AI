/**
 * File Preprocessor — Engineering Core
 *
 * Responsável por:
 * 1. Buscar o arquivo do Supabase Storage
 * 2. Converter para base64
 * 3. Para PDFs: retornar como imagem (primeira página rasterizada)
 *    MVP: envia o PDF diretamente como documento (Claude aceita base64 de PDF
 *    via document type). IFC/DWG ficam para Fase 2.
 *
 * Não contém lógica de IA — é 100% determinístico.
 */

import type { ProcessedFile } from "@/lib/providers/analysis/types";

type SupportedMime =
  | "image/jpeg"
  | "image/png"
  | "image/jpg"
  | "application/pdf";

const MIME_FROM_EXTENSION: Record<string, SupportedMime> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

/**
 * Faz download do arquivo do Storage e retorna como ProcessedFile.
 * Usa fetch direto na URL pública assinada gerada pelo Supabase.
 */
export async function preprocessFile(
  storagePath: string,
  fileType: string,
  originalFilename: string,
  supabaseStorageUrl: string,
  supabaseServiceKey: string
): Promise<ProcessedFile> {
  // Gerar URL assinada temporária (válida por 60s — suficiente para o download)
  const signedUrlResponse = await fetch(
    `${supabaseStorageUrl}/object/sign/uploads/${storagePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 }),
    }
  );

  if (!signedUrlResponse.ok) {
    throw new Error(
      `Falha ao gerar URL assinada para ${storagePath}: ${signedUrlResponse.status}`
    );
  }

  const { signedURL } = await signedUrlResponse.json();
  const fullUrl = `${supabaseStorageUrl}${signedURL}`;

  // Download do arquivo
  const fileResponse = await fetch(fullUrl);
  if (!fileResponse.ok) {
    throw new Error(
      `Falha ao baixar arquivo ${storagePath}: ${fileResponse.status}`
    );
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  const mimeType: SupportedMime =
    MIME_FROM_EXTENSION[fileType.toLowerCase()] ?? "image/jpeg";

  return {
    base64,
    mimeType,
    originalFilename,
  };
}

/**
 * Versão simplificada para uso direto com o cliente Supabase server.
 * Usa o método download() do SDK em vez de URL assinada manual.
 */
export async function preprocessFileFromSupabase(
  storagePath: string,
  fileType: string,
  originalFilename: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: any
): Promise<ProcessedFile> {
  const { data, error } = await supabaseClient.storage
    .from("uploads")
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      `Falha ao baixar arquivo do Storage: ${error?.message ?? "dados nulos"}`
    );
  }

  const arrayBuffer = await (data as Blob).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");

  const mimeType: SupportedMime =
    MIME_FROM_EXTENSION[fileType.toLowerCase()] ?? "image/jpeg";

  return { base64, mimeType, originalFilename };
}
