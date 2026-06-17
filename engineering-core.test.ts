import { describe, it, expect } from "vitest";
import {
  parseEngineeringJsonV1,
  safeParseEngineeringJsonV1,
  validateEngineeringJson,
  buildEngineeringLock,
  selectScenarioVariant,
  assemblePrompt,
  runEngineeringCorePipeline,
  normalizeMaterials,
  validateModulation,
  validateGeometry,
  validateAndNormalizeFoundation,
} from "../index";
import type { EngineeringJsonV1 } from "../index";

// ------------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------------

const VALID_GALPAO: EngineeringJsonV1 = {
  structure_type: "metalica",
  elements: {
    pillars: { count: 14, description: "HEA 240" },
    beams: { present: true, description: "IPE 400" },
    roof: { type: "duas_aguas", material: "telha_metalica", description: "inclinação 10%" },
  },
  modulation: { module_count: 6, module_dimensions_estimate: "10m x 25m" },
  materials: ["aco_estrutural", "telha_metalica", "fechamento_metalico"],
  context_suggestion: "galpao_industrial",
  confidence: { overall: 0.94, notes: "" },
  engineering_lock: {
    geometry_locked: true,
    roof_locked: true,
    pillar_locked: true,
    span_locked: true,
    modulation_locked: true,
  },
};

const VALID_SILO: EngineeringJsonV1 = {
  structure_type: "mista",
  elements: {
    pillars: { count: 8, description: "" },
    beams: { present: true, description: "" },
    roof: { type: "arco", material: "aco_estrutural", description: "" },
  },
  modulation: { module_count: 4, module_dimensions_estimate: "" },
  materials: ["aco_estrutural", "concreto_armado"],
  context_suggestion: "silo_graos",
  confidence: { overall: 0.88, notes: "cobertura com baixa confiança" },
  engineering_lock: {
    geometry_locked: true,
    roof_locked: true,
    pillar_locked: true,
    span_locked: true,
    modulation_locked: true,
  },
};

// ------------------------------------------------------------------
// SCHEMA VALIDATOR
// ------------------------------------------------------------------

describe("SchemaValidator", () => {
  it("aceita JSON válido de galpão", () => {
    const result = validateEngineeringJson(VALID_GALPAO);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });

  it("rejeita JSON sem structure_type", () => {
    const invalid = { ...VALID_GALPAO, structure_type: undefined };
    const result = validateEngineeringJson(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("rejeita context_suggestion inválido", () => {
    const invalid = { ...VALID_GALPAO, context_suggestion: "nave_espacial" };
    const result = safeParseEngineeringJsonV1(invalid);
    expect(result.success).toBe(false);
  });

  it("aceita e normaliza engineering_lock ausente usando defaults", () => {
    const withoutLock = {
      ...VALID_GALPAO,
      engineering_lock: undefined,
    };
    const result = safeParseEngineeringJsonV1(withoutLock);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.engineering_lock.geometry_locked).toBe(true);
    }
  });

  it("lança exceção em parseEngineeringJsonV1 com dado inválido", () => {
    expect(() => parseEngineeringJsonV1({ invalid: true })).toThrow();
  });
});

// ------------------------------------------------------------------
// MATERIAL RULES
// ------------------------------------------------------------------

describe("MaterialRules", () => {
  it("normaliza aliases comuns corretamente", () => {
    const result = normalizeMaterials(["aço estrutural", "concrete", "Telha Metálica"]);
    expect(result.normalized).toContain("aco_estrutural");
    expect(result.normalized).toContain("concreto_armado");
    expect(result.normalized).toContain("telha_metalica");
  });

  it("mapeia material desconhecido para 'outro' e registra warning", () => {
    const result = normalizeMaterials(["material_exotico_xpto"]);
    expect(result.normalized).toContain("outro");
    expect(result.unknown).toContain("material_exotico_xpto");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("gera prompt_fragments para cada material", () => {
    const result = normalizeMaterials(["aco_estrutural", "vidro"]);
    expect(result.promptFragments.length).toBe(2);
    expect(result.promptFragments[0]).toContain("steel");
  });

  it("deduplica materiais repetidos", () => {
    const result = normalizeMaterials(["aco", "aço", "aco_estrutural"]);
    expect(result.normalized.filter((m) => m === "aco_estrutural").length).toBe(1);
  });
});

// ------------------------------------------------------------------
// MODULATION RULES
// ------------------------------------------------------------------

describe("ModulationRules", () => {
  it("retorna válido para galpão com módulos e pilares consistentes", () => {
    const result = validateModulation(VALID_GALPAO);
    expect(result.valid).toBe(true);
    expect(result.promptFragment).toContain("6 structural bays");
    expect(result.promptFragment).toContain("14 columns");
  });

  it("emite warning quando module_count = 0", () => {
    const noModule = {
      ...VALID_GALPAO,
      modulation: { module_count: 0, module_dimensions_estimate: "" },
    };
    const result = validateModulation(noModule);
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain("não identificado");
  });

  it("emite warning para inconsistência pilares × módulos", () => {
    const inconsistent = {
      ...VALID_GALPAO,
      elements: { ...VALID_GALPAO.elements, pillars: { count: 2, description: "" } },
    };
    const result = validateModulation(inconsistent);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes("inconsistência"))).toBe(true);
  });
});

// ------------------------------------------------------------------
// GEOMETRY RULES
// ------------------------------------------------------------------

describe("GeometryRules", () => {
  it("gera fragmento correto para cobertura duas_aguas", () => {
    const result = validateGeometry(VALID_GALPAO);
    expect(result.valid).toBe(true);
    expect(result.promptFragment).toContain("gabled two-slope roof");
    expect(result.promptFragment).toContain("slope");
  });

  it("emite warning e usa fragmento genérico sem roof.type", () => {
    const noRoof = {
      ...VALID_GALPAO,
      elements: { ...VALID_GALPAO.elements, roof: { type: "", material: "", description: "" } },
    };
    const result = validateGeometry(noRoof);
    expect(result.valid).toBe(false);
    expect(result.promptFragment).toContain("original roof geometry");
  });
});

// ------------------------------------------------------------------
// FOUNDATION RULES
// ------------------------------------------------------------------

describe("FoundationRules", () => {
  it("normaliza fundação para sapatas_enterradas", () => {
    const result = validateAndNormalizeFoundation(VALID_GALPAO);
    expect(result.normalizedFoundation.type).toBe("sapatas_enterradas");
    expect(result.normalizedFoundation.visible_elements).toContain("chapa_base");
    expect(result.normalizedFoundation.visible_elements).toContain("chumbadores");
    expect(result.normalizedFoundation.render_instruction).toContain("below finished floor level");
  });

  it("emite warning para estrutura metálica sem pilares identificados", () => {
    const noPillars = {
      ...VALID_GALPAO,
      elements: { ...VALID_GALPAO.elements, pillars: { count: 0, description: "" } },
    };
    const result = validateAndNormalizeFoundation(noPillars);
    expect(result.valid).toBe(false);
    expect(result.warnings[0]).toContain("sem pilares");
  });
});

// ------------------------------------------------------------------
// ENGINEERING LOCK
// ------------------------------------------------------------------

describe("EngineeringLock", () => {
  it("gera prohibited_actions com pillar_locked = true", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    expect(lock.pillar_locked).toBe(true);
    expect(lock.prohibited_actions).toContain("move_pillars");
    expect(lock.prohibited_actions).toContain("add_pillars");
  });

  it("locked_values captura dados do JSON aprovado", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    expect(lock.locked_values.pillar_count).toBe(14);
    expect(lock.locked_values.module_count).toBe(6);
    expect(lock.locked_values.roof_type).toBe("duas_aguas");
    expect(lock.locked_values.structure_type).toBe("metalica");
  });

  it("negative_prompt_fragments contém restrições de geometria", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    expect(lock.negative_prompt_fragments.some((f) => f.includes("do not move columns"))).toBe(true);
    expect(lock.negative_prompt_fragments.some((f) => f.includes("do not alter the roof"))).toBe(true);
    expect(lock.negative_prompt_fragments.some((f) => f.includes("do not invent"))).toBe(true);
  });
});

// ------------------------------------------------------------------
// SCENARIO SELECTOR
// ------------------------------------------------------------------

describe("ScenarioSelector", () => {
  it("retorna variante válida para galpao_industrial", () => {
    const variant = selectScenarioVariant("galpao_industrial", [], 42);
    expect(variant.context_type).toBe("galpao_industrial");
    expect(variant.camera).toBeDefined();
    expect(variant.lighting).toBeDefined();
    expect(variant.weather).toBeDefined();
    expect(Object.keys(variant.prompt_fragments).length).toBeGreaterThan(0);
  });

  it("fallback para galpao_industrial em context_type desconhecido", () => {
    const variant = selectScenarioVariant("tipo_inexistente", [], 1);
    expect(variant.context_type).toBe("tipo_inexistente");
  });

  it("varia seleções entre chamadas (seed diferente)", () => {
    const v1 = selectScenarioVariant("galpao_industrial", [], 1);
    const v2 = selectScenarioVariant("galpao_industrial", [], 99999);
    const sameAll = Object.keys(v1.prompt_fragments).every(
      (k) => v1.prompt_fragments[k] === v2.prompt_fragments[k]
    );
    expect(sameAll).toBe(false);
  });

  it("anti-repetição: penaliza componentes já usados", () => {
    const first = selectScenarioVariant("galpao_industrial", [], 1);
    const counts: Record<string, number> = {};
    const N = 20;
    for (let i = 0; i < N; i++) {
      const v = selectScenarioVariant("galpao_industrial", [first], i);
      const key = `${v.lighting}__${v.weather}__${v.time_of_day}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const firstKey = `${first.lighting}__${first.weather}__${first.time_of_day}`;
    const firstCount = counts[firstKey] ?? 0;
    const othersTotal = N - firstCount;
    expect(othersTotal).toBeGreaterThan(firstCount);
  });

  it("respeita incompatibilidade pos_chuva × ceu_limpo no galpão", () => {
    let posChuvaCeuLimpo = false;
    for (let seed = 0; seed < 200; seed++) {
      const v = selectScenarioVariant("galpao_industrial", [], seed);
      if (v.weather === "pos_chuva" && v.lighting === "sol_lateral_sombras_longas") {
        posChuvaCeuLimpo = true;
        break;
      }
    }
    expect(posChuvaCeuLimpo).toBe(false);
  });
});

// ------------------------------------------------------------------
// PROMPT ASSEMBLER
// ------------------------------------------------------------------

describe("PromptAssembler", () => {
  it("gera prompt positivo com elementos estruturais", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    const variant = selectScenarioVariant("galpao_industrial", [], 42);
    const result = assemblePrompt(VALID_GALPAO, lock, variant);

    expect(result.positive_prompt).toContain("steel structure");
    expect(result.positive_prompt).toContain("14 structural columns");
    expect(result.positive_prompt).toContain("6 structural bays");
    expect(result.positive_prompt).toContain("below finished floor level");
    expect(result.positive_prompt).toContain("No real brand logos");
  });

  it("negative_prompt contém restrições do lock", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    const variant = selectScenarioVariant("galpao_industrial", [], 42);
    const result = assemblePrompt(VALID_GALPAO, lock, variant);

    expect(result.negative_prompt).toContain("do not move columns");
    expect(result.negative_prompt).toContain("do not alter the roof");
  });

  it("metadata registra structure_type e context_type corretos", () => {
    const lock = buildEngineeringLock(VALID_GALPAO);
    const variant = selectScenarioVariant("galpao_industrial", [], 42);
    const result = assemblePrompt(VALID_GALPAO, lock, variant);

    expect(result.metadata.structure_type).toBe("metalica");
    expect(result.metadata.context_type).toBe("galpao_industrial");
    expect(result.metadata.materials_normalized).toContain("aco_estrutural");
  });
});

// ------------------------------------------------------------------
// PIPELINE COMPLETO
// ------------------------------------------------------------------

describe("EngineeringCore Pipeline Completo", () => {
  it("executa pipeline galpão do início ao fim", () => {
    const output = runEngineeringCorePipeline(VALID_GALPAO);
    expect(output.lock).toBeDefined();
    expect(output.scenarioVariant).toBeDefined();
    expect(output.prompt.positive_prompt.length).toBeGreaterThan(100);
    expect(output.prompt.negative_prompt.length).toBeGreaterThan(10);
  });

  it("executa pipeline silo do início ao fim", () => {
    const output = runEngineeringCorePipeline(VALID_SILO);
    expect(output.lock.locked_values.structure_type).toBe("mista");
    expect(output.scenarioVariant.context_type).toBe("silo_graos");
    expect(output.prompt.positive_prompt).toContain("composite steel and concrete");
  });

  it("variantes consecutivas do mesmo projeto têm cenários diferentes", () => {
    const out1 = runEngineeringCorePipeline(VALID_GALPAO, []);
    const out2 = runEngineeringCorePipeline(VALID_GALPAO, [out1.scenarioVariant]);
    const out3 = runEngineeringCorePipeline(VALID_GALPAO, [out1.scenarioVariant, out2.scenarioVariant]);

    const key1 = out1.scenarioVariant.lighting + out1.scenarioVariant.weather;
    const key2 = out2.scenarioVariant.lighting + out2.scenarioVariant.weather;
    const key3 = out3.scenarioVariant.lighting + out3.scenarioVariant.weather;
    const allSame = key1 === key2 && key2 === key3;
    expect(allSame).toBe(false);
  });

  it("engineering_lock é sempre all-true para JSON padrão", () => {
    const output = runEngineeringCorePipeline(VALID_GALPAO);
    const l = output.lock;
    expect(l.geometry_locked).toBe(true);
    expect(l.roof_locked).toBe(true);
    expect(l.pillar_locked).toBe(true);
    expect(l.span_locked).toBe(true);
    expect(l.modulation_locked).toBe(true);
  });
});
