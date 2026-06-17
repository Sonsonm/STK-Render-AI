/**
 * Scenario Selector — Engineering Core
 *
 * Seleciona uma variante de cenário da scenario_library aplicando:
 * 1. Seleção ponderada por peso (weighted random)
 * 2. Anti-repetição: penaliza componentes já usados neste projeto
 * 3. Verificação de incompatibilidades entre componentes selecionados
 */

import {
  SCENARIOS,
  type ScenarioComponent,
  type ScenarioIncompatibility,
} from "./scenarios";

export interface ScenarioVariant {
  context_type: string;
  camera: string;
  urban_context: string;
  landscaping: string;
  humanization: string;
  vehicles: string;
  lighting: string;
  weather: string;
  time_of_day: string;
  vegetation: string;
  prompt_fragments: Record<string, string>;
}

type ComponentKey = keyof Omit<ScenarioVariant, "context_type" | "prompt_fragments">;

const COMPONENT_KEYS: ComponentKey[] = [
  "camera",
  "urban_context",
  "landscaping",
  "humanization",
  "vehicles",
  "lighting",
  "weather",
  "time_of_day",
  "vegetation",
];

/**
 * Seleciona uma variante de cenário com anti-repetição.
 *
 * @param contextType - tipo de empreendimento (ex: "galpao_industrial")
 * @param previouslyUsed - variantes já geradas para este projeto
 * @param seed - semente para testes determinísticos (opcional)
 */
export function selectScenarioVariant(
  contextType: string,
  previouslyUsed: ScenarioVariant[] = [],
  seed?: number
): ScenarioVariant {
  const scenario = SCENARIOS[contextType] ?? SCENARIOS["galpao_industrial"];
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;

  const COMPONENT_MAP: Record<ComponentKey, ScenarioComponent[]> = {
    camera: scenario.camera,
    urban_context: scenario.urban_context,
    landscaping: scenario.landscaping,
    humanization: scenario.humanization,
    vehicles: scenario.vehicles,
    lighting: scenario.lighting,
    weather: scenario.weather,
    time_of_day: scenario.time_of_day,
    vegetation: scenario.vegetation,
  };

  // Contar uso de cada componente nas variantes anteriores
  const usageCount = buildUsageCount(previouslyUsed);

  // Selecionar cada componente com pesos ajustados
  const selected: Partial<Record<ComponentKey, ScenarioComponent>> = {};
  let attempts = 0;
  const maxAttempts = 10;

  do {
    attempts++;
    for (const key of COMPONENT_KEYS) {
      selected[key] = weightedSelect(
        COMPONENT_MAP[key],
        usageCount[key] ?? {},
        rng
      );
    }
  } while (
    attempts < maxAttempts &&
    hasIncompatibility(selected as Record<ComponentKey, ScenarioComponent>, scenario.incompatibilities)
  );

  // Montar variante final
  const variant: ScenarioVariant = {
    context_type: contextType,
    camera: selected.camera!.id,
    urban_context: selected.urban_context!.id,
    landscaping: selected.landscaping!.id,
    humanization: selected.humanization!.id,
    vehicles: selected.vehicles!.id,
    lighting: selected.lighting!.id,
    weather: selected.weather!.id,
    time_of_day: selected.time_of_day!.id,
    vegetation: selected.vegetation!.id,
    prompt_fragments: {},
  };

  for (const key of COMPONENT_KEYS) {
    variant.prompt_fragments[key] = selected[key]!.prompt_fragment;
  }

  return variant;
}

/**
 * Seleção ponderada com penalidade por repetição.
 * Peso efetivo = weight_original / (1 + vezes_usado)
 */
function weightedSelect(
  components: ScenarioComponent[],
  usageCount: Record<string, number>,
  rng: () => number
): ScenarioComponent {
  if (components.length === 0) {
    throw new Error("No components available for selection");
  }

  const effectiveWeights = components.map((c) => {
    const timesUsed = usageCount[c.id] ?? 0;
    return c.weight / (1 + timesUsed);
  });

  const total = effectiveWeights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;

  for (let i = 0; i < components.length; i++) {
    roll -= effectiveWeights[i];
    if (roll <= 0) return components[i];
  }

  return components[components.length - 1];
}

/**
 * Constrói mapa de contagem de uso por componente a partir de variantes anteriores.
 */
function buildUsageCount(
  previouslyUsed: ScenarioVariant[]
): Record<string, Record<string, number>> {
  const count: Record<string, Record<string, number>> = {};

  for (const variant of previouslyUsed) {
    for (const key of COMPONENT_KEYS) {
      const id = variant[key];
      if (!count[key]) count[key] = {};
      count[key][id] = (count[key][id] ?? 0) + 1;
    }
  }

  return count;
}

/**
 * Verifica se a seleção atual tem incompatibilidades.
 */
function hasIncompatibility(
  selected: Record<ComponentKey, ScenarioComponent>,
  incompatibilities: ScenarioIncompatibility[]
): boolean {
  const selectedIds = new Set(
    Object.values(selected).map((c) => c.id)
  );

  for (const rule of incompatibilities) {
    if (selectedIds.has(rule.if)) {
      for (const excluded of rule.excludes) {
        if (selectedIds.has(excluded)) return true;
      }
    }
  }

  return false;
}

/**
 * Gerador de números pseudoaleatórios com semente — para testes.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
