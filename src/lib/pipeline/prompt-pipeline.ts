/**
 * Prompt Pipeline — Sprint 5
 *
 * Executado após o usuário aprovar a análise técnica.
 * Encadeia Engineering Core completo e persiste resultado em `prompts`.
 *
 * Etapas:
 * 1. Buscar EngineeringJSON aprovado
 * 2. Buscar variantes de cenário já usadas neste projeto (anti-repetição)
 * 3. Rodar runEngineeringCorePipeline (lock + cenário + prompt)
 * 4. Salvar em `prompts`
 * 5. Atualizar status do projeto para "prompt_ready"
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { runEngineeringCorePipeline } from "@/lib/engineering-core/index";
import { parseEngineeringJsonV1 } from "@/lib/engineering-core/schema/engineering-json";
import type { ScenarioVariant } from "@/lib/engineering-core/scenario-library/selector";

export interface PromptPipelineResult {
  success: boolean;
  promptId?: string;
  errors?: string[];
}

export async function runPromptPipeline(
  projectId: string
): Promise<PromptPipelineResult> {
  const supabase = createServiceRoleClient();

  // Registrar job
  const { data: job } = await supabase
    .from("jobs")
    .insert({
      project_id: projectId,
      job_type: "build_prompt",
      status: "processing",
      payload: { project_id: projectId },
    })
    .select("id")
    .single();

  try {
    // --- 1. Buscar análise técnica aprovada ---
    const { data: analysis, error: analysisError } = await supabase
      .from("technical_analysis")
      .select("id, structured_json")
      .eq("project_id", projectId)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Analise tecnica nao encontrada para este projeto.");
    }

    // Revalidar JSON contra schema (garante integridade mesmo que banco esteja desatualizado)
    const engineeringJson = parseEngineeringJsonV1(analysis.structured_json);

    // --- 2. Buscar variantes de cenário já usadas ---
    const { data: previousPrompts } = await supabase
      .from("prompts")
      .select("scenario_variant_used")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    const previousVariants: ScenarioVariant[] = (previousPrompts ?? [])
      .map((p: { scenario_variant_used: unknown }) => p.scenario_variant_used as ScenarioVariant)
      .filter(Boolean);

    // --- 3. Rodar Engineering Core Pipeline ---
    const coreOutput = runEngineeringCorePipeline(engineeringJson, previousVariants);

    // --- 4. Salvar prompt ---
    const { data: savedPrompt, error: promptError } = await supabase
      .from("prompts")
      .insert({
        project_id: projectId,
        structured_json_snapshot: {
          ...engineeringJson,
          engineering_lock: coreOutput.lock,
        } as unknown as Record<string, unknown>,
        scenario_variant_used: coreOutput.scenarioVariant as unknown as Record<string, unknown>,
        final_prompt: coreOutput.prompt.positive_prompt,
        model_used: "engineering-core-v1",
      })
      .select("id")
      .single();

    if (promptError || !savedPrompt) {
      throw new Error(`Erro ao salvar prompt: ${promptError?.message}`);
    }

    // --- 5. Atualizar status ---
    await supabase
      .from("projects")
      .update({ status: "prompt_ready" })
      .eq("id", projectId);

    if (job) {
      await supabase
        .from("jobs")
        .update({ status: "done", result: { prompt_id: savedPrompt.id } })
        .eq("id", job.id);
    }

    return { success: true, promptId: savedPrompt.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[PromptPipeline] Erro no projeto ${projectId}:`, msg);

    await supabase
      .from("projects")
      .update({ status: "error" })
      .eq("id", projectId);

    if (job) {
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: msg })
        .eq("id", job.id);
    }

    return { success: false, errors: [msg] };
  }
}
