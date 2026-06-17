/**
 * PromptAssembler — Engineering Core
 *
 * Monta o prompt final combinando em ordem:
 * 1. Tipo e descrição estrutural base
 * 2. Materiais predominantes (do cenário, cruzados com materiais reais)
 * 3. Componentes de cenário (câmera, contexto, paisagismo, etc.)
 * 4. Regras de fundação
 * 5. Modulação e geometria (Engineering Lock — positive constraints)
 * 6. Constraints de fidelidade estrutural (negative prompt incorporado)
 * 7. Safety rules globais
 */

import type { EngineeringJsonV1 } from "./schema/engineering-json";
import type { EngineeringLockSnapshot } from "./engineering-lock";
import type { ScenarioVariant } from "./scenario-library/selector";
import { SCENARIOS, GLOBAL_SAFETY_RULES } from "./scenario-library/scenarios";
import {
  validateAndNormalizeFoundation,
  buildFoundationPromptFragment,
} from "./rules/foundation-rules";
import { normalizeMaterials } from "./rules/material-rules";
import { validateModulation } from "./rules/modulation-rules";
import { validateGeometry } from "./rules/geometry-rules";

export interface AssembledPrompt {
  /** Prompt positivo completo — enviado ao Render Provider */
  positive_prompt: string;

  /** Fragmentos negativos — injetados como negative_prompt no Render Provider */
  negative_prompt: string;

  /** Snapshot para auditoria e debug */
  metadata: {
    structure_type: string;
    context_type: string;
    scenario_variant_id: string;
    materials_normalized: string[];
    warnings: string[];
    assembled_at: string;
  };
}

export function assemblePrompt(
  engineeringJson: EngineeringJsonV1,
  lock: EngineeringLockSnapshot,
  scenarioVariant: ScenarioVariant
): AssembledPrompt {
  const warnings: string[] = [];

  // --- 1. Tipo estrutural base ---
  const structureLabel = buildStructureLabel(engineeringJson);

  // --- 2. Materiais ---
  const materialResult = normalizeMaterials(engineeringJson.materials);
  warnings.push(...materialResult.warnings);
  const materialFragment = materialResult.promptFragments.join(", ");

  // --- 3. Cenário: fragmentos dos componentes selecionados ---
  const scenarioFragments = buildScenarioFragments(scenarioVariant, engineeringJson.context_suggestion);

  // --- 4. Fundação ---
  const foundationResult = validateAndNormalizeFoundation(engineeringJson);
  warnings.push(...foundationResult.warnings);
  const foundationFragment = buildFoundationPromptFragment(foundationResult.normalizedFoundation);

  // --- 5. Modulação ---
  const modulationResult = validateModulation(engineeringJson);
  warnings.push(...modulationResult.warnings);

  // --- 6. Geometria ---
  const geometryResult = validateGeometry(engineeringJson);
  warnings.push(...geometryResult.warnings);

  // --- 7. Engineering Lock — positive constraints ---
  const lockPositive = lock.positive_constraints.join(". ");

  // --- 8. Safety ---
  const safetyFragment = GLOBAL_SAFETY_RULES.safety_prompt_fragment;

  // --- MONTAGEM DO POSITIVE PROMPT ---
  const positiveParts = [
    `Hyper-realistic architectural exterior render. ${structureLabel}.`,
    materialFragment ? `Materials: ${materialFragment}.` : "",
    scenarioFragments.context,
    scenarioFragments.camera,
    scenarioFragments.atmosphere,
    scenarioFragments.human,
    foundationFragment,
    modulationResult.promptFragment,
    geometryResult.promptFragment,
    lockPositive,
    safetyFragment,
  ].filter(Boolean);

  const positivePrompt = positiveParts.join(" ");

  // --- MONTAGEM DO NEGATIVE PROMPT ---
  const negativePrompt = lock.negative_prompt_fragments.join(", ");

  return {
    positive_prompt: positivePrompt,
    negative_prompt: negativePrompt,
    metadata: {
      structure_type: engineeringJson.structure_type,
      context_type: engineeringJson.context_suggestion,
      scenario_variant_id: [
        scenarioVariant.lighting,
        scenarioVariant.weather,
        scenarioVariant.time_of_day,
        scenarioVariant.vehicles,
      ].join("_"),
      materials_normalized: materialResult.normalized,
      warnings,
      assembled_at: new Date().toISOString(),
    },
  };
}

function buildStructureLabel(data: EngineeringJsonV1): string {
  const typeMap: Record<string, string> = {
    metalica: "steel structure",
    concreto: "reinforced concrete structure",
    mista: "composite steel and concrete structure",
  };
  const structureType = typeMap[data.structure_type] ?? "structure";
  const roofType = data.elements.roof.type
    ? `, ${data.elements.roof.type} roof`
    : "";
  const pillars =
    data.elements.pillars.count > 0
      ? `, ${data.elements.pillars.count} structural columns`
      : "";
  const modules =
    data.modulation.module_count > 0
      ? `, ${data.modulation.module_count} structural bays`
      : "";
  return `${structureType}${roofType}${pillars}${modules}`;
}

function buildScenarioFragments(
  variant: ScenarioVariant,
  contextType: string
): { context: string; camera: string; atmosphere: string; human: string } {
  const scenario = SCENARIOS[contextType];
  const frags = variant.prompt_fragments;

  // Câmera
  const camera = frags.camera ?? "wide three-quarter front exterior view";

  // Contexto urbano + paisagismo + vegetação
  const contextParts = [
    frags.urban_context,
    frags.landscaping,
    frags.vegetation,
  ].filter(Boolean);
  const context = contextParts.join(". ");

  // Atmosfera (lighting + weather + time_of_day)
  const atmosphereParts = [
    frags.time_of_day,
    frags.weather,
    frags.lighting,
  ].filter(Boolean);
  const atmosphere = atmosphereParts.join(", ");

  // Humanização + veículos
  const humanParts = [frags.humanization, frags.vehicles].filter(Boolean);
  const human = humanParts.join(". ");

  // Materiais do cenário (se o cenário tem materiais predominantes e o JSON não tem)
  void scenario; // usado pelo PromptAssembler para contexto, não diretamente aqui

  return { context, camera, atmosphere, human };
}
