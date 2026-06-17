/**
 * ModulationRules — Engineering Core
 *
 * Valida e normaliza a modulação estrutural:
 * - Consistência entre número de módulos e número de pilares
 * - Para estruturas em pórtico: pilares = módulos + 1 (regra básica)
 * - Alerta quando módulo_count = 0 (não identificado)
 */

import type { EngineeringJsonV1 } from "../schema/engineering-json";

export interface ModulationValidationResult {
  valid: boolean;
  warnings: string[];
  promptFragment: string;
}

export function validateModulation(
  data: EngineeringJsonV1
): ModulationValidationResult {
  const warnings: string[] = [];
  const { module_count } = data.modulation;
  const pillarCount = data.elements.pillars.count;

  // Regra 1: módulo não identificado
  if (module_count === 0) {
    warnings.push(
      "Número de módulos não identificado (0). Prompt usará descrição genérica."
    );
  }

  // Regra 2: consistência módulos × pilares em estrutura de pórtico simples
  // Para estrutura metálica/mista: em uma fila simples de pilares,
  // pilares = módulos + 1. Toleramos ±2 para fachadas com pilares duplos.
  if (
    module_count > 0 &&
    pillarCount > 0 &&
    (data.structure_type === "metalica" || data.structure_type === "mista")
  ) {
    const expectedMin = module_count - 1;
    const expectedMax = (module_count + 1) * 2 + 2; // margem para duplas fileiras
    if (pillarCount < expectedMin) {
      warnings.push(
        `Possível inconsistência: ${module_count} módulos mas apenas ${pillarCount} pilares identificados.`
      );
    }
    if (pillarCount > expectedMax) {
      warnings.push(
        `Número de pilares (${pillarCount}) elevado para ${module_count} módulos — verificar se análise captou estruturas vizinhas.`
      );
    }
  }

  const promptFragment = buildModulationPromptFragment(module_count, pillarCount);

  return { valid: warnings.length === 0, warnings, promptFragment };
}

function buildModulationPromptFragment(
  moduleCount: number,
  pillarCount: number
): string {
  if (moduleCount === 0 && pillarCount === 0) {
    return "structural bay modulation as per original design";
  }
  if (moduleCount > 0 && pillarCount > 0) {
    return `exactly ${moduleCount} structural bays with ${pillarCount} columns — do not alter bay count or column positions`;
  }
  if (moduleCount > 0) {
    return `exactly ${moduleCount} structural bays — do not alter modulation`;
  }
  return `${pillarCount} columns maintaining original spacing and modulation`;
}
