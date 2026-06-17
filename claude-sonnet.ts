/**
 * ClaudeSonnetAdapter — Analysis Provider
 *
 * Implementação real da interface AnalysisProvider usando Claude Sonnet
 * via API Anthropic. Não contém lógica de engenharia — apenas traduz
 * a interface para chamadas de API.
 *
 * Troca de provider = novo arquivo nesta pasta implementando a mesma interface.
 */

import type {
  AnalysisProvider,
  AnalysisCapability,
  ProcessedFile,
  ProjectContext,
  TechnicalAnalysisResult,
} from "./types";
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseAnalysisResponse,
} from "@/lib/engineering-core/analysis-prompt";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: AnthropicContent[];
}

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

interface AnthropicResponse {
  content: { type: string; text?: string }[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class ClaudeSonnetAdapter implements AnalysisProvider {
  readonly id = "claude-sonnet";
  readonly capabilities: AnalysisCapability[] = [
    "vision_triage",
    "technical_report",
    "json_extraction",
    "vision_comparison",
  ];
  readonly costTier = "medium" as const;

  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY nao configurada. Adicione ao .env.local."
      );
    }
    this.apiKey = key;
  }

  async generateTechnicalAnalysis(
    files: ProcessedFile[],
    context: ProjectContext
  ): Promise<TechnicalAnalysisResult> {
    if (files.length === 0) {
      throw new Error("Nenhum arquivo fornecido para analise.");
    }

    const userContent: AnthropicContent[] = [];

    // Adicionar imagens/PDFs como conteúdo visual
    for (const file of files) {
      if (this.isImageMime(file.mimeType)) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: file.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: file.base64,
          },
        });
      }
      // PDFs são enviados como imagem (pré-rasterizados pelo preprocessor)
    }

    // Texto do prompt
    userContent.push({
      type: "text",
      text: buildAnalysisUserPrompt(context),
    });

    const messages: AnthropicMessage[] = [
      { role: "user", content: userContent },
    ];

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildAnalysisSystemPrompt(),
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Anthropic API error ${response.status}: ${errorBody}`
      );
    }

    const data: AnthropicResponse = await response.json();

    const textContent = data.content.find((c) => c.type === "text");
    if (!textContent?.text) {
      throw new Error("Resposta da API sem conteudo de texto.");
    }

    const parsed = parseAnalysisResponse(textContent.text);

    return {
      rawReport: parsed.rawReport,
      structuredJson: parsed.structuredJson,
    };
  }

  private isImageMime(mime: string): boolean {
    return ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(mime);
  }
}
