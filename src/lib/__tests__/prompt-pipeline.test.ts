import { describe, it, expect } from "vitest";
import { runEngineeringCorePipeline } from "../engineering-core/index";
import type { EngineeringJsonV1 } from "../engineering-core/schema/engineering-json";
import type { ScenarioVariant } from "../engineering-core/scenario-library/selector";

const BASE_JSON: EngineeringJsonV1 = {
  structure_type: "metalica",
  elements: {
    pillars: { count: 14, description: "HEA 240" },
    beams: { present: true, description: "IPE 400" },
    roof: { type: "duas_aguas", material: "telha_metalica", description: "10%" },
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

// ------------------------------------------------------------------
// PIPELINE COMPLETO (fluxo de aprovação)
// ------------------------------------------------------------------

describe("Prompt Pipeline — fluxo de aprovacao", () => {
  it("gera output completo para galpao", () => {
    const output = runEngineeringCorePipeline(BASE_JSON);
    expect(output.lock).toBeDefined();
    expect(output.scenarioVariant.context_type).toBe("galpao_industrial");
    expect(output.prompt.positive_prompt.length).toBeGreaterThan(100);
    expect(output.prompt.negative_prompt.length).toBeGreaterThan(10);
  });

  it("positive_prompt contem todos os elementos criticos", () => {
    const output = runEngineeringCorePipeline(BASE_JSON);
    const p = output.prompt.positive_prompt;

    // Estrutura
    expect(p).toContain("steel structure");
    expect(p).toContain("14 structural columns");
    expect(p).toContain("6 structural bays");

    // Cobertura
    expect(p).toContain("gabled two-slope roof");

    // Fundacao
    expect(p).toContain("below finished floor level");
    expect(p).toContain("base plates");

    // Safety
    expect(p).toContain("No real brand logos");
  });

  it("negative_prompt contem todas as restricoes do lock", () => {
    const output = runEngineeringCorePipeline(BASE_JSON);
    const n = output.prompt.negative_prompt;

    expect(n).toContain("do not move columns");
    expect(n).toContain("do not alter the roof");
    expect(n).toContain("do not change bay spacing");
    expect(n).toContain("do not invent architectural elements");
    expect(n).toContain("do not alter structural spans");
  });

  it("metadata registra contexto e materiais corretamente", () => {
    const output = runEngineeringCorePipeline(BASE_JSON);
    const meta = output.prompt.metadata;

    expect(meta.structure_type).toBe("metalica");
    expect(meta.context_type).toBe("galpao_industrial");
    expect(meta.materials_normalized).toContain("aco_estrutural");
    expect(meta.materials_normalized).toContain("telha_metalica");
    expect(meta.assembled_at).toBeTruthy();
  });

  it("lock snapshot captura valores exatos do JSON aprovado", () => {
    const output = runEngineeringCorePipeline(BASE_JSON);
    const lv = output.lock.locked_values;

    expect(lv.pillar_count).toBe(14);
    expect(lv.module_count).toBe(6);
    expect(lv.roof_type).toBe("duas_aguas");
    expect(lv.structure_type).toBe("metalica");
    expect(lv.module_dimensions_estimate).toBe("10m x 25m");
  });
});

// ------------------------------------------------------------------
// ANTI-REPETIÇÃO (cenários consecutivos)
// ------------------------------------------------------------------

describe("Anti-repeticao de cenarios no pipeline", () => {
  it("3 gerações consecutivas do mesmo projeto variam o cenario", () => {
    const v1 = runEngineeringCorePipeline(BASE_JSON, []);
    const v2 = runEngineeringCorePipeline(BASE_JSON, [v1.scenarioVariant]);
    const v3 = runEngineeringCorePipeline(BASE_JSON, [v1.scenarioVariant, v2.scenarioVariant]);

    const keys = (v: ScenarioVariant) =>
      `${v.lighting}__${v.weather}__${v.time_of_day}__${v.vehicles}`;

    const allSame = keys(v1.scenarioVariant) === keys(v2.scenarioVariant) &&
                    keys(v2.scenarioVariant) === keys(v3.scenarioVariant);

    expect(allSame).toBe(false);
  });

  it("cada variante tem context_type correto", () => {
    const out = runEngineeringCorePipeline(BASE_JSON);
    expect(out.scenarioVariant.context_type).toBe("galpao_industrial");
  });
});

// ------------------------------------------------------------------
// TODOS OS 11 CONTEXTOS
// ------------------------------------------------------------------

describe("Todos os 11 contextos geram prompt valido", () => {
  const contexts = [
    "galpao_industrial",
    "centro_distribuicao",
    "hipermercado",
    "atacarejo",
    "posto_combustivel",
    "silo_graos",
    "reservatorio_agua",
    "escola",
    "universidade",
    "hospital",
    "edificio_corporativo",
  ] as const;

  for (const ctx of contexts) {
    it(`${ctx} — gera prompt positivo e negativo`, () => {
      const json: EngineeringJsonV1 = { ...BASE_JSON, context_suggestion: ctx };
      const output = runEngineeringCorePipeline(json);

      expect(output.scenarioVariant.context_type).toBe(ctx);
      expect(output.prompt.positive_prompt.length).toBeGreaterThan(50);
      expect(output.prompt.negative_prompt.length).toBeGreaterThan(10);
      expect(output.lock.pillar_locked).toBe(true);
    });
  }
});
