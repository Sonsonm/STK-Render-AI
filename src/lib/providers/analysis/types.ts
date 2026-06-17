/**
 * AnalysisProvider — Contrato comum a todos os providers de análise
 * (Claude Sonnet/Haiku, GPT, Gemini, modelos locais futuros).
 *
 * Nenhum componente do sistema deve depender diretamente de um provider
 * específico; toda chamada passa por esta interface, resolvida via
 * ProviderRouter (Sprint 4) a partir de `provider_routing_rules`.
 *
 * Implementação real do adapter: Sprint 4.
 */

export interface ProcessedFile {
  /** Conteúdo do arquivo já pré-processado (ex: imagem rasterizada em base64). */
  base64: string;
  mimeType: string;
  originalFilename: string;
}

export interface ProjectContext {
  projectId: string;
  projectName: string;
}

export interface TechnicalAnalysisResult {
  rawReport: string;
  /** Objeto bruto retornado pelo provider, a ser validado pelo SchemaValidator. */
  structuredJson: unknown;
}

export type AnalysisCapability =
  | "vision_triage"
  | "technical_report"
  | "json_extraction"
  | "ifc_parsing"
  | "dwg_parsing"
  | "vision_comparison";

export interface AnalysisProvider {
  id: string;
  capabilities: AnalysisCapability[];
  costTier: "low" | "medium" | "high";

  /**
   * MVP: análise + extração de JSON em uma única chamada.
   */
  generateTechnicalAnalysis(
    files: ProcessedFile[],
    context: ProjectContext
  ): Promise<TechnicalAnalysisResult>;
}
