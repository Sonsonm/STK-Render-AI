/**
 * Analysis Prompt — Engineering Core
 *
 * Define o prompt enviado ao Analysis Provider para análise técnica.
 * Mantido no Engineering Core (não no adapter) para que a lógica
 * de engenharia seja provider-agnostic e testável isoladamente.
 */

import type { ProjectContext } from "@/lib/providers/analysis/types";

export const ENGINEERING_JSON_SCHEMA_DESCRIPTION = `
{
  "structure_type": "metalica" | "concreto" | "mista",
  "elements": {
    "pillars": { "count": number, "description": string },
    "beams":   { "present": boolean, "description": string },
    "roof":    { "type": string, "material": string, "description": string }
  },
  "modulation": {
    "module_count": number,
    "module_dimensions_estimate": string
  },
  "materials": string[],
  "context_suggestion": "galpao_industrial"|"centro_distribuicao"|"hipermercado"|"atacarejo"|"posto_combustivel"|"silo_graos"|"reservatorio_agua"|"escola"|"universidade"|"hospital"|"edificio_corporativo"|"outro",
  "confidence": { "overall": number (0.0-1.0), "notes": string },
  "engineering_lock": {
    "geometry_locked": true,
    "roof_locked": true,
    "pillar_locked": true,
    "span_locked": true,
    "modulation_locked": true
  }
}`;

export function buildAnalysisSystemPrompt(): string {
  return `You are an expert structural engineer specializing in steel structures, reinforced concrete, and BIM.
Your task is to perform a precise technical analysis of structural engineering project images or documents.

ANALYSIS RULES:
- Identify the structural system: metalica (steel), concreto (reinforced concrete), or mista (composite)
- Count structural elements precisely: pillars, bays/modules
- Identify roof type: duas_aguas (gabled), uma_agua (mono-pitch), shed, plana (flat), arco (arched)
- List all structural materials using these canonical terms: aco_estrutural, concreto_armado, pre_moldado, vidro, madeira, alvenaria, fechamento_metalico, telha_metalica, aluminio, aco_inox
- Estimate modulation (structural bay count and approximate dimensions)
- Suggest the building context type from the allowed list
- Assign a confidence score (0.0 to 1.0) based on image quality and visible detail

CRITICAL ENGINEERING RULES:
- engineering_lock fields must ALWAYS be true — never modify them
- If you cannot identify an element with confidence, use count: 0 and describe uncertainty in notes
- module_dimensions_estimate: use format like "10m x 25m" or "8m bays" or "" if unknown
- roof.type must be one of: duas_aguas, uma_agua, shed, plana, arco, or a descriptive string if none match
- materials array must use the canonical Portuguese terms listed above

OUTPUT FORMAT:
Respond with EXACTLY two sections, separated by ---JSON---:

Section 1: A detailed technical report in Portuguese describing the structural system, elements identified, materials, modulation, and any observations or uncertainties.

---JSON---

Section 2: ONLY valid JSON matching this schema exactly:
${ENGINEERING_JSON_SCHEMA_DESCRIPTION}

Do NOT include markdown code fences, comments, or any text outside these two sections.`;
}

export function buildAnalysisUserPrompt(context: ProjectContext): string {
  return `Analyze the structural project image(s) for project "${context.projectName}".

Provide:
1. A detailed technical report in Portuguese (minimum 3 paragraphs) covering:
   - Structural system type and main characteristics
   - Identified structural elements (pillars, beams, roof, bracing, etc.)
   - Materials and estimated modulation
   - Any observations about image quality or identification confidence

2. The EngineeringJSON following the schema exactly.

Remember: engineering_lock values must always be true.`;
}

/**
 * Faz o parse da resposta bruta do LLM nos dois campos esperados.
 * Robusto a variações menores de formatação.
 */
export function parseAnalysisResponse(raw: string): {
  rawReport: string;
  structuredJson: unknown;
} {
  const separator = "---JSON---";
  const sepIndex = raw.indexOf(separator);

  if (sepIndex === -1) {
    // Fallback: tentar extrair JSON de qualquer lugar da resposta
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return {
          rawReport: raw.replace(jsonMatch[0], "").trim(),
          structuredJson: JSON.parse(jsonMatch[0]),
        };
      } catch {
        // cai no throw abaixo
      }
    }
    throw new Error(
      "Resposta do provider nao contem o separador ---JSON--- esperado."
    );
  }

  const reportPart = raw.slice(0, sepIndex).trim();
  const jsonPart = raw.slice(sepIndex + separator.length).trim();

  // Remover possíveis code fences que o modelo pode ter adicionado
  const cleanJson = jsonPart
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let structuredJson: unknown;
  try {
    structuredJson = JSON.parse(cleanJson);
  } catch (e) {
    throw new Error(`JSON invalido na resposta do provider: ${e}`);
  }

  return { rawReport: reportPart, structuredJson };
}
