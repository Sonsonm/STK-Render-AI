export interface ProcessedFile {
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
  generateTechnicalAnalysis(
    files: ProcessedFile[],
    context: ProjectContext
  ): Promise<TechnicalAnalysisResult>;
}
