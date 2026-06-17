import { describe, it, expect } from "vitest";
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseAnalysisResponse,
} from "../engineering-core/analysis-prompt";

// ------------------------------------------------------------------
// FIXTURES
// ------------------------------------------------------------------

const VALID_JSON = {
  structure_type: "metalica",
  elements: {
    pillars: { count: 14, description: "HEA 240" },
    beams: { present: true, description: "IPE 400" },
    roof: { type: "duas_aguas", material: "telha_metalica", description: "10%" },
  },
  modulation: { module_count: 6, module_dimensions_estimate: "10m x 25m" },
  materials: ["aco_estrutural", "telha_metalica"],
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
// ANALYSIS PROMPT
// ------------------------------------------------------------------

describe("AnalysisPrompt", () => {
  it("system prompt contem regras de engenharia essenciais", () => {
    const prompt = buildAnalysisSystemPrompt();
    expect(prompt).toContain("engineering_lock");
    expect(prompt).toContain("---JSON---");
    expect(prompt).toContain("aco_estrutural");
    expect(prompt).toContain("duas_aguas");
  });

  it("user prompt contem nome do projeto", () => {
    const prompt = buildAnalysisUserPrompt({ projectId: "abc", projectName: "Galpao Teste" });
    expect(prompt).toContain("Galpao Teste");
    expect(prompt).toContain("engineering_lock");
  });

  it("parse de resposta bem-formada com separador", () => {
    const raw = `Este e o relatorio tecnico do projeto estrutural.
A estrutura e metalica com 6 modulos.

---JSON---

${JSON.stringify(VALID_JSON)}`;

    const result = parseAnalysisResponse(raw);
    expect(result.rawReport).toContain("relatorio tecnico");
    expect(result.structuredJson).toEqual(VALID_JSON);
  });

  it("parse remove code fences do JSON se presentes", () => {
    const raw = `Relatorio aqui.

---JSON---

\`\`\`json
${JSON.stringify(VALID_JSON)}
\`\`\``;

    const result = parseAnalysisResponse(raw);
    expect(result.structuredJson).toEqual(VALID_JSON);
  });

  it("parse faz fallback para extração de JSON sem separador", () => {
    const raw = `Relatorio aqui. ${JSON.stringify(VALID_JSON)} fim.`;
    const result = parseAnalysisResponse(raw);
    expect(result.structuredJson).toEqual(VALID_JSON);
  });

  it("parse lanca erro para resposta sem JSON", () => {
    const raw = "Apenas texto sem JSON nenhum aqui.";
    expect(() => parseAnalysisResponse(raw)).toThrow();
  });

  it("parse lanca erro para JSON invalido apos separador", () => {
    const raw = `Relatorio.\n---JSON---\n{ invalido json aqui `;
    expect(() => parseAnalysisResponse(raw)).toThrow();
  });
});

// ------------------------------------------------------------------
// INTEGRAÇÃO ENGINEERING CORE + PIPELINE PARSING
// ------------------------------------------------------------------

describe("Pipeline: Engineering Core valida saida do provider", () => {
  it("JSON valido do provider passa pelo SchemaValidator", async () => {
    const { validateEngineeringJson } = await import(
      "../engineering-core/schema-validator"
    );
    const result = validateEngineeringJson(VALID_JSON);
    expect(result.valid).toBe(true);
    expect(result.data?.structure_type).toBe("metalica");
  });

  it("JSON com structure_type invalido e rejeitado", async () => {
    const { validateEngineeringJson } = await import(
      "../engineering-core/schema-validator"
    );
    const invalid = { ...VALID_JSON, structure_type: "madeira" };
    const result = validateEngineeringJson(invalid);
    expect(result.valid).toBe(false);
  });

  it("JSON com confidence fora do range 0-1 e rejeitado", async () => {
    const { validateEngineeringJson } = await import(
      "../engineering-core/schema-validator"
    );
    const invalid = { ...VALID_JSON, confidence: { overall: 1.5, notes: "" } };
    const result = validateEngineeringJson(invalid);
    expect(result.valid).toBe(false);
  });

  it("JSON valido gera lock + prompt sem erros", async () => {
    const { validateEngineeringJson } = await import(
      "../engineering-core/schema-validator"
    );
    const { runEngineeringCorePipeline } = await import(
      "../engineering-core/index"
    );

    const validation = validateEngineeringJson(VALID_JSON);
    expect(validation.valid).toBe(true);

    const output = runEngineeringCorePipeline(validation.data!);
    expect(output.prompt.positive_prompt.length).toBeGreaterThan(50);
    expect(output.prompt.negative_prompt).toContain("do not move columns");
  });
});
