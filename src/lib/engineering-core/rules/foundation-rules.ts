/**
 * FoundationRules — Engineering Core
 *
 * Regras de fundação obrigatória da STK:
 * - Sapatas enterradas, blocos abaixo do piso acabado
 * - Apenas chapa base, chumbadores e graute estrutural podem aparecer
 * - Fundação nunca é renderizada exposta
 */

import type { EngineeringJsonV1 } from "../schema/engineering-json";

export interface FoundationValidationResult {
  valid: boolean;
  warnings: string[];
  normalizedFoundation: FoundationNormalized;
}

export interface FoundationNormalized {
  type: "sapatas_enterradas";
  visible_elements: ("chapa_base" | "chumbadores" | "graute")[];
  render_instruction: string;
}

const VALID_VISIBLE_ELEMENTS = ["chapa_base", "chumbadores", "graute"] as const;

export function validateAndNormalizeFoundation(
  data: EngineeringJsonV1
): FoundationValidationResult {
  const warnings: string[] = [];

  // Regra 1: estruturas metálicas e mistas obrigatoriamente têm sapatas enterradas
  if (
    data.structure_type === "metalica" ||
    data.structure_type === "mista"
  ) {
    if (data.elements.pillars.count === 0) {
      warnings.push(
        "Estrutura metálica sem pilares identificados — verificar análise."
      );
    }
  }

  // Regra 2: materiais visíveis — apenas os três elementos permitidos
  const normalized: FoundationNormalized = {
    type: "sapatas_enterradas",
    visible_elements: [...VALID_VISIBLE_ELEMENTS],
    render_instruction:
      "Foundation must be entirely below finished floor level. " +
      "Only base plates, anchor bolts, and structural grout are visible at column bases. " +
      "No footings, pile caps, or concrete blocks visible above grade.",
  };

  return { valid: warnings.length === 0, warnings, normalizedFoundation: normalized };
}

/**
 * Gera o fragmento de prompt referente à fundação para o PromptAssembler.
 */
export function buildFoundationPromptFragment(
  foundation: FoundationNormalized
): string {
  return foundation.render_instruction;
}
