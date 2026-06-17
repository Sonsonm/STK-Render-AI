/**
 * Engineering Lock — Engineering Core
 *
 * Gera o bloco de restrições não-negociáveis a partir do EngineeringJSON
 * aprovado. Este bloco é injetado em TODO prompt enviado ao Render Provider,
 * independente de qual for.
 *
 * Na Fase 2 é promovido para tabela própria (engineering_lock_snapshots).
 */

import type { EngineeringJsonV1 } from "./schema/engineering-json";

export interface EngineeringLockSnapshot {
  /** Flags booleanas (do schema) */
  geometry_locked: boolean;
  roof_locked: boolean;
  pillar_locked: boolean;
  span_locked: boolean;
  modulation_locked: boolean;

  /** Valores capturados no momento da aprovação — base para QC na Fase 2 */
  locked_values: {
    pillar_count: number;
    module_count: number;
    module_dimensions_estimate: string;
    roof_type: string;
    roof_material: string;
    structure_type: string;
  };

  /** Ações proibidas — injetadas como negative prompt */
  prohibited_actions: string[];

  /** Fragmentos de prompt positivo — reforçam a fidelidade */
  positive_constraints: string[];

  /** Fragmentos para negative prompt do render provider */
  negative_prompt_fragments: string[];
}

export function buildEngineeringLock(
  data: EngineeringJsonV1
): EngineeringLockSnapshot {
  const lock = data.engineering_lock;

  const prohibitedActions: string[] = [];
  const positiveConstraints: string[] = [];
  const negativeFragments: string[] = [];

  if (lock.pillar_locked) {
    prohibitedActions.push("move_pillars", "add_pillars", "remove_pillars");
    positiveConstraints.push(
      `maintain exactly ${data.elements.pillars.count} columns in their original positions`
    );
    negativeFragments.push(
      "do not move columns",
      "do not add or remove structural columns"
    );
  }

  if (lock.modulation_locked) {
    prohibitedActions.push("change_modulation", "alter_bay_spacing");
    positiveConstraints.push(
      `preserve exactly ${data.modulation.module_count} structural bays with original spacing`
    );
    negativeFragments.push(
      "do not change bay spacing or modulation",
      "maintain exact number of structural bays"
    );
  }

  if (lock.roof_locked) {
    prohibitedActions.push("modify_roof", "change_roof_profile");
    const roofDesc =
      data.elements.roof.type
        ? `${data.elements.roof.type} roof profile`
        : "original roof profile";
    positiveConstraints.push(`preserve the exact ${roofDesc} as in source`);
    negativeFragments.push(
      "do not alter the roof shape, slope, or ridge line",
      "do not change roof material or profile"
    );
  }

  if (lock.span_locked) {
    prohibitedActions.push("alter_spans", "change_bay_dimensions");
    negativeFragments.push("do not alter structural spans or bay dimensions");
  }

  if (lock.geometry_locked) {
    prohibitedActions.push(
      "reinterpret_structure",
      "invent_elements",
      "create_nonexistent_structures"
    );
    positiveConstraints.push(
      "reproduce the structural geometry exactly as analysed — no creative reinterpretation"
    );
    negativeFragments.push(
      "do not invent architectural elements not present in source",
      "do not reinterpret the structural form",
      "do not alter overall building envelope or proportions"
    );
  }

  return {
    geometry_locked: lock.geometry_locked,
    roof_locked: lock.roof_locked,
    pillar_locked: lock.pillar_locked,
    span_locked: lock.span_locked,
    modulation_locked: lock.modulation_locked,

    locked_values: {
      pillar_count: data.elements.pillars.count,
      module_count: data.modulation.module_count,
      module_dimensions_estimate: data.modulation.module_dimensions_estimate,
      roof_type: data.elements.roof.type,
      roof_material: data.elements.roof.material,
      structure_type: data.structure_type,
    },

    prohibited_actions: prohibitedActions,
    positive_constraints: positiveConstraints,
    negative_prompt_fragments: negativeFragments,
  };
}
