/**
 * GeometryRules — Engineering Core
 *
 * Valida geometria estrutural e gera as restrições de fidelidade
 * geométrica que serão injetadas no prompt final.
 */

import type { EngineeringJsonV1 } from "../schema/engineering-json";

export interface GeometryValidationResult {
  valid: boolean;
  warnings: string[];
  promptFragment: string;
}

export function validateGeometry(
  data: EngineeringJsonV1
): GeometryValidationResult {
  const warnings: string[] = [];
  const fragments: string[] = [];

  const { roof } = data.elements;
  const { module_dimensions_estimate } = data.modulation;

  // Regra 1: cobertura identificada
  if (!roof.type || roof.type.trim() === "") {
    warnings.push("Tipo de cobertura não identificado. Será tratado como genérico.");
    fragments.push("maintain the original roof geometry as shown in source");
  } else {
    fragments.push(buildRoofFragment(roof.type, roof.material));
  }

  // Regra 2: dimensões estimadas
  if (module_dimensions_estimate && module_dimensions_estimate.trim() !== "") {
    fragments.push(
      `approximate bay dimensions: ${module_dimensions_estimate} — preserve proportions exactly`
    );
  }

  // Regra 3: restrição geral de geometria (sempre presente)
  fragments.push(
    "do not alter the structural geometry, proportions, or overall building envelope"
  );

  return {
    valid: warnings.length === 0,
    warnings,
    promptFragment: fragments.join(". "),
  };
}

function buildRoofFragment(roofType: string, material: string): string {
  const matPart = material ? ` with ${material}` : "";
  const typeMap: Record<string, string> = {
    duas_aguas: "gabled two-slope roof",
    uma_agua: "single-slope mono-pitch roof",
    shed: "shed roof with clerestory",
    plana: "flat roof",
    arco: "arched roof",
    trapezoidal: "trapezoidal profile roof",
  };
  const roofLabel = typeMap[roofType.toLowerCase()] ?? `${roofType} roof`;
  return `${roofLabel}${matPart} — maintain exact slope, ridge line, and overhang as in original design`;
}
