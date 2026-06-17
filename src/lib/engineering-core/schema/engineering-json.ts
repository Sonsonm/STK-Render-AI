import { z } from "zod";

/**
 * EngineeringJSON v1 — Schema mínimo viável (Fase 1 / MVP).
 *
 * Este schema é a "menor versão possível" definida no plano de execução.
 * Evolui para v2 na Fase 2 com campos detalhados (trusses, purlins, bracing,
 * cladding, foundation completa, spans array, base_plates, anchor_bolts,
 * facade_openings_locked, slope_locked, locked_values_snapshot, etc).
 *
 * Mantido como superset-compatible: v2 deve aceitar documentos v1 válidos
 * com campos opcionais ausentes.
 */

export const StructureTypeEnum = z.enum(["metalica", "concreto", "mista"]);

export const ContextSuggestionEnum = z.enum([
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
  "outro",
]);

export const EngineeringLockSchema = z.object({
  geometry_locked: z.boolean().default(true),
  roof_locked: z.boolean().default(true),
  pillar_locked: z.boolean().default(true),
  span_locked: z.boolean().default(true),
  modulation_locked: z.boolean().default(true),
});

export const EngineeringJsonV1Schema = z.object({
  structure_type: StructureTypeEnum,

  elements: z.object({
    pillars: z.object({
      count: z.number().int().nonnegative(),
      description: z.string().default(""),
    }),
    beams: z.object({
      present: z.boolean(),
      description: z.string().default(""),
    }),
    roof: z.object({
      type: z.string().default(""),
      material: z.string().default(""),
      description: z.string().default(""),
    }),
  }),

  modulation: z.object({
    module_count: z.number().int().nonnegative(),
    module_dimensions_estimate: z.string().default(""),
  }),

  materials: z.array(z.string()).default([]),

  context_suggestion: ContextSuggestionEnum,

  confidence: z.object({
    overall: z.number().min(0).max(1),
    notes: z.string().default(""),
  }),

  engineering_lock: EngineeringLockSchema.default({
    geometry_locked: true,
    roof_locked: true,
    pillar_locked: true,
    span_locked: true,
    modulation_locked: true,
  }),
});

export type EngineeringJsonV1 = z.infer<typeof EngineeringJsonV1Schema>;
export type EngineeringLock = z.infer<typeof EngineeringLockSchema>;

/**
 * Valida e normaliza um objeto recebido do Analysis Provider.
 * Lança erro de parsing caso o schema seja inválido — o caller
 * (pipeline de análise) deve tratar isso como falha de job.
 */
export function parseEngineeringJsonV1(data: unknown): EngineeringJsonV1 {
  return EngineeringJsonV1Schema.parse(data);
}

export function safeParseEngineeringJsonV1(data: unknown) {
  return EngineeringJsonV1Schema.safeParse(data);
}
