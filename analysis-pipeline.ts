/**
 * Analysis Pipeline — orquestra o fluxo completo de análise
 *
 * Etapas:
 * 1. Marcar projeto como "analyzing"
 * 2. Buscar arquivos do projeto no Storage
 * 3. Pré-processar arquivos (base64)
 * 4. Chamar Analysis Provider
 * 5. Validar resposta com Engineering Core (SchemaValidator + regras)
 * 6. Salvar technical_analysis no banco
 * 7. Marcar projeto como "analyzed"
 *
 * Em caso de erro em qualquer etapa: marcar como "error" e registrar.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateEngineeringJson } from "@/lib/engineering-core/schema-validator";
import { preprocessFileFromSupabase } from "@/lib/engineering-core/file-preprocessor";
import { resolveAnalysisProvider } from "@/lib/providers/analysis/router";

export interface AnalysisPipelineResult {
  success: boolean;
  analysisId?: string;
  errors?: string[];
}

export async function runAnalysisPipeline(
  projectId: string
): Promise<AnalysisPipelineResult> {
  const supabase = createServiceRoleClient();

  // --- 1. Buscar projeto e marcar como analyzing ---
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name, status, user_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return { success: false, errors: ["Projeto nao encontrado."] };
  }

  if (!["uploaded", "error"].includes(project.status)) {
    return {
      success: false,
      errors: [`Status invalido para analise: ${project.status}`],
    };
  }

  await supabase
    .from("projects")
    .update({ status: "analyzing" })
    .eq("id", projectId);

  // Registrar job
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      project_id: projectId,
      job_type: "analyze",
      status: "processing",
      payload: { project_id: projectId },
    })
    .select("id")
    .single();

  try {
    // --- 2. Buscar arquivos ---
    const { data: files, error: filesError } = await supabase
      .from("project_files")
      .select("id, storage_path, file_type, original_filename")
      .eq("project_id", projectId);

    if (filesError || !files || files.length === 0) {
      throw new Error("Nenhum arquivo encontrado para o projeto.");
    }

    // MVP: analisar apenas o primeiro arquivo
    // Fase 2: suporte a múltiplos arquivos por projeto
    const primaryFile = files[0];

    // --- 3. Pré-processar ---
    const processedFile = await preprocessFileFromSupabase(
      primaryFile.storage_path,
      primaryFile.file_type,
      primaryFile.original_filename,
      supabase
    );

    // --- 4. Chamar Analysis Provider ---
    const provider = resolveAnalysisProvider("technical_analysis");

    const analysisResult = await provider.generateTechnicalAnalysis(
      [processedFile],
      { projectId, projectName: project.name }
    );

    // --- 5. Validar com Engineering Core ---
    const validation = validateEngineeringJson(analysisResult.structuredJson);

    if (!validation.valid || !validation.data) {
      const errorMsg = `EngineeringJSON invalido: ${validation.errors?.join(", ")}`;
      throw new Error(errorMsg);
    }

    const engineeringJson = validation.data;

    // --- 6. Salvar análise ---
    const { data: analysis, error: analysisError } = await supabase
      .from("technical_analysis")
      .insert({
        project_id: projectId,
        raw_report: analysisResult.rawReport,
        structured_json: engineeringJson as unknown as Record<string, unknown>,
        structure_type: engineeringJson.structure_type,
      })
      .select("id")
      .single();

    if (analysisError || !analysis) {
      throw new Error(`Erro ao salvar analise: ${analysisError?.message}`);
    }

    // --- 7. Marcar como analyzed ---
    await supabase
      .from("projects")
      .update({ status: "analyzed" })
      .eq("id", projectId);

    // Atualizar job
    if (job) {
      await supabase
        .from("jobs")
        .update({
          status: "done",
          result: { analysis_id: analysis.id },
        })
        .eq("id", job.id);
    }

    return { success: true, analysisId: analysis.id };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error(`[AnalysisPipeline] Erro no projeto ${projectId}:`, errorMessage);

    // Marcar projeto como error
    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", projectId);

    // Atualizar job
    if (job) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", job.id);
    }

    return { success: false, errors: [errorMessage] };
  }
}
