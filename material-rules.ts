/**
 * MaterialRules — Engineering Core
 *
 * Normaliza e classifica materiais identificados pelo Analysis Provider
 * contra o vocabulário canônico da STK.
 * Distingue: aço estrutural, concreto armado, pré-moldado, vidro,
 * madeira, alvenaria, fechamentos metálicos.
 */

export type CanonicalMaterial =
  | "aco_estrutural"
  | "concreto_armado"
  | "pre_moldado"
  | "vidro"
  | "madeira"
  | "alvenaria"
  | "fechamento_metalico"
  | "telha_metalica"
  | "aco_inox"
  | "aluminio"
  | "outro";

export interface MaterialValidationResult {
  normalized: CanonicalMaterial[];
  unknown: string[];
  promptFragments: string[];
  warnings: string[];
}

/**
 * Mapa de aliases → material canônico.
 * Cobre variações de escrita que um LLM pode retornar.
 */
const MATERIAL_ALIASES: Record<string, CanonicalMaterial> = {
  // Aço estrutural
  aco_estrutural: "aco_estrutural",
  "aço estrutural": "aco_estrutural",
  aco: "aco_estrutural",
  "aço": "aco_estrutural",
  steel: "aco_estrutural",
  "structural steel": "aco_estrutural",
  "perfil metalico": "aco_estrutural",
  "perfil metálico": "aco_estrutural",
  hea: "aco_estrutural",
  heb: "aco_estrutural",
  ipe: "aco_estrutural",

  // Concreto armado
  concreto_armado: "concreto_armado",
  "concreto armado": "concreto_armado",
  concreto: "concreto_armado",
  "reinforced concrete": "concreto_armado",
  concrete: "concreto_armado",
  rc: "concreto_armado",

  // Pré-moldado
  pre_moldado: "pre_moldado",
  "pré-moldado": "pre_moldado",
  "pre-moldado": "pre_moldado",
  "concreto pre-moldado": "pre_moldado",
  "precast concrete": "pre_moldado",
  precast: "pre_moldado",

  // Vidro
  vidro: "vidro",
  glass: "vidro",
  "vidro temperado": "vidro",
  "vidro laminado": "vidro",
  "curtain wall": "vidro",

  // Madeira
  madeira: "madeira",
  wood: "madeira",
  timber: "madeira",
  "madeira tratada": "madeira",

  // Alvenaria
  alvenaria: "alvenaria",
  tijolo: "alvenaria",
  bloco: "alvenaria",
  masonry: "alvenaria",
  brick: "alvenaria",
  "bloco ceramico": "alvenaria",
  "bloco cerâmico": "alvenaria",

  // Fechamento metálico
  fechamento_metalico: "fechamento_metalico",
  "fechamento metálico": "fechamento_metalico",
  "painel metalico": "fechamento_metalico",
  "painel metálico": "fechamento_metalico",
  "chapa metalica": "fechamento_metalico",
  "chapa metálica": "fechamento_metalico",
  "metal cladding": "fechamento_metalico",
  "sandwich panel": "fechamento_metalico",
  "painel sandwich": "fechamento_metalico",

  // Telha metálica
  telha_metalica: "telha_metalica",
  "telha metálica": "telha_metalica",
  telha: "telha_metalica",
  "trapezoidal roofing": "telha_metalica",
  "metal roofing": "telha_metalica",
  "telha trapezoidal": "telha_metalica",
  "telha galvanizada": "telha_metalica",

  // Alumínio
  aluminio: "aluminio",
  "alumínio": "aluminio",
  aluminum: "aluminio",
  aluminium: "aluminio",

  // Inox
  aco_inox: "aco_inox",
  "aço inox": "aco_inox",
  inox: "aco_inox",
  "stainless steel": "aco_inox",
};

/** Fragmentos de prompt por material canônico */
const MATERIAL_PROMPT_FRAGMENTS: Record<CanonicalMaterial, string> = {
  aco_estrutural: "painted structural steel frame members",
  concreto_armado: "exposed reinforced concrete structural elements",
  pre_moldado: "precast concrete panels and elements",
  vidro: "glass facade panels and glazing",
  madeira: "timber structural or decorative elements",
  alvenaria: "masonry brick or block infill walls",
  fechamento_metalico: "metal sandwich panel wall cladding",
  telha_metalica: "trapezoidal metal roof sheeting",
  aco_inox: "stainless steel architectural elements",
  aluminio: "aluminum framing and cladding elements",
  outro: "mixed construction materials",
};

export function normalizeMaterials(rawMaterials: string[]): MaterialValidationResult {
  const normalized = new Set<CanonicalMaterial>();
  const unknown: string[] = [];
  const warnings: string[] = [];

  for (const raw of rawMaterials) {
    const key = raw.toLowerCase().trim();
    const canonical = MATERIAL_ALIASES[key];
    if (canonical) {
      normalized.add(canonical);
    } else {
      unknown.push(raw);
      normalized.add("outro");
    }
  }

  if (unknown.length > 0) {
    warnings.push(
      `Materiais não reconhecidos mapeados para "outro": ${unknown.join(", ")}`
    );
  }

  const normalizedArray = Array.from(normalized);
  const promptFragments = normalizedArray.map((m) => MATERIAL_PROMPT_FRAGMENTS[m]);

  return { normalized: normalizedArray, unknown, promptFragments, warnings };
}

export function getMaterialPromptFragment(material: CanonicalMaterial): string {
  return MATERIAL_PROMPT_FRAGMENTS[material];
}
