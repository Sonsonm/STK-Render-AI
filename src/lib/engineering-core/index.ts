/**
 * Engineering Core — Ponto de entrada público
 *
 * Exporta o pipeline principal e os tipos necessários para
 * o resto da aplicação. Nenhum outro módulo deve importar
 * diretamente de submódulos do Engineering Core — usar este index.
 */

export { parseEngineeringJsonV1, safeParseEngineeringJsonV1 } from "./schema/engineering-json";
export type { EngineeringJsonV1, EngineeringLock } from "./schema/engineering-json";

export { validateEngineeringJson } from "./schema-validator";
export type { ValidationResult } from "./schema-validator";

export { buildEngineeringLock } from "./engineering-lock";
export type { EngineeringLockSnapshot } from "./engineering-lock";

export { selectScenarioVariant } from "./scenario-library/selector";
export type { ScenarioVariant } from "./scenario-library/selector";

export { assemblePrompt } from "./prompt-assembler";
export type { AssembledPrompt } from "./prompt-assembler";

export { normalizeMaterials } from "./rules/material-rules";
export { validateModulation } from "./rules/modulation-rules";
export { validateGeometry } from "./rules/geometry-rules";
export { validateAndNormalizeFoundation } from "./rules/foundation-rules";

/**
 * Pipeline completo: JSON aprovado → prompt final.
 * Função de conveniência que encadeia todos os módulos em ordem.
 */
import type { EngineeringJsonV1 } from "./schema/engineering-json";
import type { ScenarioVariant } from "./scenario-library/selector";
import { buildEngineeringLock } from "./engineering-lock";
import { selectScenarioVariant } from "./scenario-library/selector";
import { assemblePrompt } from "./prompt-assembler";
import type { AssembledPrompt } from "./prompt-assembler";
import type { EngineeringLockSnapshot } from "./engineering-lock";

export interface EngineeringCoreOutput {
  lock: EngineeringLockSnapshot;
  scenarioVariant: ScenarioVariant;
  prompt: AssembledPrompt;
}

export function runEngineeringCorePipeline(
  approvedJson: EngineeringJsonV1,
  previousScenarioVariants: ScenarioVariant[] = []
): EngineeringCoreOutput {
  // 1. Gerar Engineering Lock a partir do JSON aprovado
  const lock = buildEngineeringLock(approvedJson);

  // 2. Selecionar variante de cenário (anti-repetição)
  const scenarioVariant = selectScenarioVariant(
    approvedJson.context_suggestion,
    previousScenarioVariants
  );

  // 3. Montar prompt final
  const prompt = assemblePrompt(approvedJson, lock, scenarioVariant);

  return { lock, scenarioVariant, prompt };
}
