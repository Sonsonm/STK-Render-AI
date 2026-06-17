/**
 * Scenario Library — dados completos dos 11 contextos.
 * Estrutura data-driven: cada contexto tem componentes com peso,
 * fragment de prompt e tags de incompatibilidade.
 *
 * Na Fase 2 isto é carregado do banco (scenario_library), mas
 * mantemos esta cópia local para:
 *  1. Funcionar sem banco (testes unitários)
 *  2. Servir como seed autoritativo do banco
 */

export interface ScenarioComponent {
  id: string;
  prompt_fragment: string;
  weight: number;
  tags?: string[];
}

export interface ScenarioIncompatibility {
  if: string;
  excludes: string[];
}

export interface ScenarioData {
  context_type: string;
  name: string;
  camera: ScenarioComponent[];
  urban_context: ScenarioComponent[];
  landscaping: ScenarioComponent[];
  humanization: ScenarioComponent[];
  vehicles: ScenarioComponent[];
  lighting: ScenarioComponent[];
  weather: ScenarioComponent[];
  time_of_day: ScenarioComponent[];
  vegetation: ScenarioComponent[];
  predominant_materials: { id: string; prompt_fragment: string }[];
  engineering_rules: {
    foundation: string;
    visible_elements_allowed: string[];
    mandatory_elements: string[];
  };
  incompatibilities: ScenarioIncompatibility[];
}

const CAMERA_DEFAULT: ScenarioComponent[] = [
  { id: "external_front_3quarter", prompt_fragment: "wide three-quarter front exterior view, eye-level perspective", weight: 3 },
  { id: "external_side_elevation", prompt_fragment: "side elevation view showing full building length", weight: 2 },
  { id: "external_aerial_low", prompt_fragment: "low aerial drone perspective, slight downward angle showing roof and surroundings", weight: 2 },
  { id: "external_entrance_focus", prompt_fragment: "ground-level view focused on main entrance and access area", weight: 2 },
];

export const SCENARIOS: Record<string, ScenarioData> = {

  galpao_industrial: {
    context_type: "galpao_industrial",
    name: "Galpão Industrial",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "zona_industrial_isolada", prompt_fragment: "isolated industrial zone with distant warehouses", weight: 2 },
      { id: "via_acesso_asfaltada", prompt_fragment: "paved access road leading to the facility", weight: 3 },
      { id: "torres_energia_distantes", prompt_fragment: "distant power transmission towers on the horizon", weight: 1 },
      { id: "polo_logistico", prompt_fragment: "busy logistics hub with multiple warehouses in background", weight: 2 },
    ],
    landscaping: [
      { id: "grama_perimetral_baixa", prompt_fragment: "low-cut grass strip along the building perimeter", weight: 3 },
      { id: "area_pavimentada_sem_vegetacao", prompt_fragment: "fully paved surrounding area", weight: 2 },
      { id: "canteiro_gramado_arvores_esparsas", prompt_fragment: "grassy median with sparse trees near entrance", weight: 2 },
    ],
    humanization: [
      { id: "sem_pessoas", prompt_fragment: "no people visible", weight: 2 },
      { id: "funcionarios_proximos_docas", prompt_fragment: "a few workers near the loading docks", weight: 2 },
      { id: "operador_empilhadeira", prompt_fragment: "a forklift operator working in the yard", weight: 1 },
    ],
    vehicles: [
      { id: "carretas_nas_docas", prompt_fragment: "several semi-trailer trucks parked at loading docks", weight: 3 },
      { id: "caminhoes_em_movimento", prompt_fragment: "trucks moving through the logistics yard", weight: 2 },
      { id: "carros_funcionarios", prompt_fragment: "employee cars in a designated parking lot", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_difusa", prompt_fragment: "soft diffused natural daylight", weight: 3 },
      { id: "sol_lateral_sombras_longas", prompt_fragment: "low side sunlight casting long shadows", weight: 2 },
      { id: "ceu_nublado_uniforme", prompt_fragment: "overcast sky with uniform soft lighting", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear blue sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 3 },
      { id: "pos_chuva", prompt_fragment: "wet pavement after rain, reflective surfaces", weight: 1 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "fim_tarde_dourado", prompt_fragment: "golden hour late afternoon light", weight: 2 },
      { id: "meio_dia", prompt_fragment: "midday overhead sunlight", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_esparsas_fundo", prompt_fragment: "sparse trees in the background", weight: 2 },
      { id: "sem_vegetacao", prompt_fragment: "minimal vegetation", weight: 2 },
      { id: "linha_arvores_limite", prompt_fragment: "tree line marking property boundary", weight: 1 },
    ],
    predominant_materials: [
      { id: "telha_metalica_galvanizada", prompt_fragment: "galvanized metal roofing and wall panels" },
      { id: "estrutura_aco_pintada", prompt_fragment: "painted structural steel frame" },
      { id: "piso_concreto_industrial", prompt_fragment: "industrial concrete floor slab" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["pilares_metalicos", "vigas", "terças", "cobertura_metalica", "contraventamentos"],
    },
    incompatibilities: [
      { if: "pos_chuva", excludes: ["ceu_limpo", "sol_lateral_sombras_longas"] },
      { if: "sem_pessoas", excludes: ["funcionarios_proximos_docas", "operador_empilhadeira"] },
    ],
  },

  centro_distribuicao: {
    context_type: "centro_distribuicao",
    name: "Centro de Distribuição",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "polo_logistico", prompt_fragment: "large logistics hub with multiple warehouses nearby", weight: 3 },
      { id: "rodovia_proxima", prompt_fragment: "major highway visible in the distance", weight: 2 },
      { id: "cerca_perimetral", prompt_fragment: "perimeter security fencing around the facility", weight: 2 },
    ],
    landscaping: [
      { id: "gramado_aparado", prompt_fragment: "neatly trimmed grass perimeter", weight: 3 },
      { id: "patio_concreto_amplo", prompt_fragment: "large concrete yard surrounding building", weight: 3 },
    ],
    humanization: [
      { id: "operadores_docas", prompt_fragment: "yard operators near the dock area", weight: 2 },
      { id: "sem_pessoas", prompt_fragment: "no people visible", weight: 2 },
    ],
    vehicles: [
      { id: "muitas_carretas_docas", prompt_fragment: "numerous trailers docked along loading bays", weight: 3 },
      { id: "caminhoes_fila", prompt_fragment: "trucks queued waiting in the yard", weight: 2 },
      { id: "estacionamento_funcionarios", prompt_fragment: "employee parking lot with multiple cars", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright wide natural daylight", weight: 3 },
      { id: "sol_alto_sombras_curtas", prompt_fragment: "high sun with short shadows", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 2 },
    ],
    vegetation: [
      { id: "linha_arvores_limite", prompt_fragment: "tree line marking property boundary", weight: 2 },
      { id: "minima_vegetacao", prompt_fragment: "minimal vegetation", weight: 2 },
    ],
    predominant_materials: [
      { id: "painel_isotermico", prompt_fragment: "insulated metal sandwich panel walls" },
      { id: "estrutura_metalica_grande_vao", prompt_fragment: "long-span structural steel framing" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["pilares_metalicos", "vigas_grande_vao", "terças", "cobertura_metalica", "docas_carga"],
    },
    incompatibilities: [
      { if: "sem_pessoas", excludes: ["operadores_docas"] },
    ],
  },

  hipermercado: {
    context_type: "hipermercado",
    name: "Hipermercado",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "avenida_movimentada", prompt_fragment: "busy avenue in front of the building", weight: 3 },
      { id: "predios_comerciais_fundo", prompt_fragment: "commercial buildings visible in background", weight: 2 },
      { id: "rotatoria_acesso", prompt_fragment: "traffic roundabout near entrance", weight: 1 },
    ],
    landscaping: [
      { id: "canteiros_decorativos_entrada", prompt_fragment: "decorative landscaped beds near entrance", weight: 3 },
      { id: "calcadas_largas", prompt_fragment: "wide sidewalks with urban landscaping", weight: 2 },
    ],
    humanization: [
      { id: "pessoas_com_carrinhos", prompt_fragment: "people walking with shopping carts", weight: 3 },
      { id: "fluxo_moderado", prompt_fragment: "moderate pedestrian flow near entrance", weight: 2 },
      { id: "poucas_pessoas", prompt_fragment: "a few people near store entrance", weight: 1 },
    ],
    vehicles: [
      { id: "estacionamento_parcial", prompt_fragment: "partially occupied parking lot", weight: 3 },
      { id: "carrinhos_dispersos", prompt_fragment: "shopping carts scattered across parking area", weight: 2 },
      { id: "carros_em_movimento", prompt_fragment: "cars driving on adjacent road", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_lateral_suave", prompt_fragment: "soft side sunlight", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 2 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 3 },
      { id: "fim_tarde", prompt_fragment: "late afternoon light", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_estacionamento", prompt_fragment: "trees distributed throughout parking lot", weight: 2 },
      { id: "arbustos_decorativos", prompt_fragment: "decorative shrubs near entrance", weight: 2 },
    ],
    predominant_materials: [
      { id: "fachada_aco_vidro", prompt_fragment: "steel and glass storefront facade" },
      { id: "estrutura_metalica", prompt_fragment: "long-span steel structure" },
      { id: "painel_acm", prompt_fragment: "ACM composite panel cladding, neutral branding" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["pilares_metalicos", "vigas", "cobertura", "fachada_principal"],
    },
    incompatibilities: [
      { if: "poucas_pessoas", excludes: ["pessoas_com_carrinhos", "fluxo_moderado"] },
    ],
  },

  atacarejo: {
    context_type: "atacarejo",
    name: "Atacarejo",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "via_arterial", prompt_fragment: "arterial road providing access to facility", weight: 3 },
      { id: "zona_mista_comercial", prompt_fragment: "mixed commercial-industrial surrounding area", weight: 2 },
    ],
    landscaping: [
      { id: "area_pavimentada_ampla", prompt_fragment: "large paved frontage area", weight: 3 },
      { id: "canteiros_simples", prompt_fragment: "simple landscaped beds at entrance", weight: 2 },
    ],
    humanization: [
      { id: "clientes_carrinhos_paletes", prompt_fragment: "customers with carts near palletized goods", weight: 3 },
      { id: "funcionarios_paletes", prompt_fragment: "staff moving pallets near loading area", weight: 2 },
    ],
    vehicles: [
      { id: "estacionamento_grande", prompt_fragment: "large parking area with pickup trucks, partially occupied", weight: 3 },
      { id: "caminhoes_pequenos", prompt_fragment: "small delivery trucks loading and unloading", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_alto", prompt_fragment: "high overhead sun", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 2 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 3 },
    ],
    vegetation: [
      { id: "arvores_esparsas", prompt_fragment: "sparse trees in parking area", weight: 2 },
      { id: "minima_vegetacao", prompt_fragment: "minimal vegetation", weight: 2 },
    ],
    predominant_materials: [
      { id: "estrutura_metalica_aparente", prompt_fragment: "exposed structural steel frame" },
      { id: "fechamento_metalico_simples", prompt_fragment: "simple metal cladding panels" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["pilares_metalicos", "vigas", "cobertura_metalica"],
    },
    incompatibilities: [],
  },

  posto_combustivel: {
    context_type: "posto_combustivel",
    name: "Posto de Combustível",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "esquina_avenida", prompt_fragment: "corner lot on a busy avenue", weight: 3 },
      { id: "rodovia_acostamento", prompt_fragment: "highway location with roadside shoulder", weight: 2 },
    ],
    landscaping: [
      { id: "canteiros_pequenos", prompt_fragment: "small decorative planting beds", weight: 2 },
      { id: "pavimentacao_total", prompt_fragment: "fully paved forecourt, no vegetation", weight: 3 },
    ],
    humanization: [
      { id: "frentista_atendendo", prompt_fragment: "an attendant servicing a vehicle at the pump", weight: 2 },
      { id: "clientes_loja", prompt_fragment: "customers near convenience store entrance", weight: 1 },
      { id: "sem_pessoas", prompt_fragment: "no people visible", weight: 1 },
    ],
    vehicles: [
      { id: "carros_abastecendo", prompt_fragment: "cars refueling at the pumps", weight: 3 },
      { id: "carros_transito", prompt_fragment: "cars passing on adjacent road", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "noite_canopy", prompt_fragment: "evening with artificial canopy lighting illuminating forecourt", weight: 1 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 2 },
      { id: "fim_tarde", prompt_fragment: "late afternoon light", weight: 2 },
      { id: "noite", prompt_fragment: "evening with artificial lighting", weight: 1 },
    ],
    vegetation: [
      { id: "minima_vegetacao", prompt_fragment: "minimal vegetation", weight: 3 },
    ],
    predominant_materials: [
      { id: "estrutura_metalica_canopy", prompt_fragment: "steel canopy structure" },
      { id: "acm_fachada", prompt_fragment: "ACM panel facade on convenience store, neutral branding" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["pilares_canopy", "estrutura_cobertura_canopy"],
    },
    incompatibilities: [
      { if: "noite_canopy", excludes: ["luz_natural_ampla"] },
      { if: "noite", excludes: ["manha", "meio_dia", "fim_tarde"] },
    ],
  },

  silo_graos: {
    context_type: "silo_graos",
    name: "Silo de Grãos",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "estrada_rural_terra", prompt_fragment: "rural dirt road nearby", weight: 3 },
      { id: "isolado_area_agricola", prompt_fragment: "isolated facility within open agricultural land", weight: 3 },
    ],
    landscaping: [
      { id: "terreno_terra_batida", prompt_fragment: "compacted dirt ground surrounding structure", weight: 3 },
      { id: "area_gramada_cascalho", prompt_fragment: "grassy area with gravel access paths", weight: 2 },
    ],
    humanization: [
      { id: "sem_pessoas", prompt_fragment: "no people visible", weight: 2 },
      { id: "operador_base", prompt_fragment: "a worker near the base of the structure", weight: 1 },
    ],
    vehicles: [
      { id: "caminhao_graneleiro_carregando", prompt_fragment: "a grain hauling truck being loaded", weight: 3 },
      { id: "caminhoes_fila", prompt_fragment: "trucks queued waiting nearby", weight: 2 },
      { id: "trator_agricola", prompt_fragment: "an agricultural tractor nearby", weight: 1 },
    ],
    lighting: [
      { id: "luz_campo_aberto", prompt_fragment: "bright open-field natural daylight", weight: 3 },
      { id: "sol_alto_sombras_curtas", prompt_fragment: "high sun with short shadows", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky with vast horizon", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "fim_tarde_dourado", prompt_fragment: "golden hour late afternoon", weight: 2 },
    ],
    vegetation: [
      { id: "plantacao_fundo", prompt_fragment: "crop fields in the background", weight: 3 },
      { id: "vegetacao_rasteira_seca", prompt_fragment: "dry low ground vegetation", weight: 2 },
    ],
    predominant_materials: [
      { id: "chapa_aco_corrugada", prompt_fragment: "corrugated steel silo panels" },
      { id: "estrutura_metalica_suporte", prompt_fragment: "steel support structure and walkways" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["corpo_silo", "estrutura_suporte", "escadas_acesso"],
    },
    incompatibilities: [
      { if: "sem_pessoas", excludes: ["operador_base"] },
    ],
  },

  reservatorio_agua: {
    context_type: "reservatorio_agua",
    name: "Reservatório de Água",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "area_elevada", prompt_fragment: "elevated terrain with surrounding landscape visible", weight: 3 },
      { id: "proximo_instalacoes", prompt_fragment: "near auxiliary treatment facility structures", weight: 1 },
    ],
    landscaping: [
      { id: "gramado_perimetral", prompt_fragment: "grass surrounding reservoir base", weight: 3 },
      { id: "cascalho_acesso", prompt_fragment: "gravel access path around structure", weight: 2 },
    ],
    humanization: [
      { id: "sem_pessoas", prompt_fragment: "no people visible", weight: 3 },
      { id: "tecnico_manutencao", prompt_fragment: "a maintenance technician near access ladder", weight: 1 },
    ],
    vehicles: [
      { id: "sem_veiculos", prompt_fragment: "no vehicles visible", weight: 3 },
      { id: "veiculo_servico", prompt_fragment: "a utility service vehicle parked nearby", weight: 1 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_lateral_volume", prompt_fragment: "side sunlight emphasizing structure volume", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 2 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 2 },
      { id: "fim_tarde_dourado", prompt_fragment: "golden hour late afternoon", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_esparsas_fundo", prompt_fragment: "sparse trees in background", weight: 2 },
      { id: "vegetacao_nativa", prompt_fragment: "native vegetation surrounding site", weight: 2 },
    ],
    predominant_materials: [
      { id: "concreto_aparente", prompt_fragment: "exposed reinforced concrete" },
      { id: "revestimento_impermeabilizante", prompt_fragment: "waterproof protective coating finish" },
    ],
    engineering_rules: {
      foundation: "sapatas_ou_radier_conforme_projeto",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute", "escadas_acesso", "guarda_corpo"],
      mandatory_elements: ["corpo_reservatorio", "acessos_tecnicos"],
    },
    incompatibilities: [
      { if: "sem_veiculos", excludes: ["veiculo_servico"] },
      { if: "sem_pessoas", excludes: ["tecnico_manutencao"] },
    ],
  },

  escola: {
    context_type: "escola",
    name: "Escola",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "bairro_residencial", prompt_fragment: "residential neighborhood surroundings", weight: 3 },
      { id: "rua_local_tranquila", prompt_fragment: "quiet local street in front of building", weight: 2 },
    ],
    landscaping: [
      { id: "patio_gramado_arvores", prompt_fragment: "grassy courtyard with shade trees", weight: 3 },
      { id: "quadra_esportiva", prompt_fragment: "sports court adjacent to building", weight: 2 },
    ],
    humanization: [
      { id: "alunos_patio", prompt_fragment: "students in the courtyard, generic figures", weight: 3 },
      { id: "poucas_pessoas", prompt_fragment: "few people visible, classes in session", weight: 2 },
    ],
    vehicles: [
      { id: "sem_veiculos", prompt_fragment: "no vehicles near building", weight: 2 },
      { id: "van_escolar", prompt_fragment: "a school van parked nearby", weight: 1 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_suave_manha", prompt_fragment: "soft morning sunlight", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 1 },
    ],
    vegetation: [
      { id: "arvores_patio", prompt_fragment: "trees in courtyard providing shade", weight: 3 },
      { id: "jardineiras", prompt_fragment: "planter boxes along walkways", weight: 1 },
    ],
    predominant_materials: [
      { id: "alvenaria_pintada", prompt_fragment: "painted masonry walls" },
      { id: "concreto_estrutural", prompt_fragment: "exposed reinforced concrete structure" },
      { id: "esquadrias_metalicas", prompt_fragment: "metal-framed glass windows" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["blocos_salas_aula", "patio_central", "circulacoes_cobertas"],
    },
    incompatibilities: [
      { if: "sem_veiculos", excludes: ["van_escolar"] },
    ],
  },

  universidade: {
    context_type: "universidade",
    name: "Universidade / Campus",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "campus_aberto", prompt_fragment: "open campus with multiple academic buildings nearby", weight: 3 },
      { id: "via_interna_campus", prompt_fragment: "internal campus road or pathway", weight: 2 },
    ],
    landscaping: [
      { id: "praca_gramada", prompt_fragment: "central grassy plaza with walkways", weight: 3 },
      { id: "jardins_paisagisticos", prompt_fragment: "landscaped garden areas between buildings", weight: 2 },
    ],
    humanization: [
      { id: "estudantes_circulando", prompt_fragment: "students walking between buildings", weight: 3 },
      { id: "grupos_estudo_externo", prompt_fragment: "small groups sitting in outdoor study areas", weight: 2 },
    ],
    vehicles: [
      { id: "bicicletas", prompt_fragment: "bicycles parked near building entrances", weight: 2 },
      { id: "estacionamento_distante", prompt_fragment: "parking area visible in the distance", weight: 2 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_lateral_suave", prompt_fragment: "soft side sunlight", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 2 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 2 },
      { id: "fim_tarde", prompt_fragment: "late afternoon light", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_porte_grande", prompt_fragment: "large mature trees in central plaza", weight: 3 },
      { id: "jardins_arbustivos", prompt_fragment: "shrub gardens along pathways", weight: 2 },
    ],
    predominant_materials: [
      { id: "concreto_aparente", prompt_fragment: "exposed structural concrete" },
      { id: "fachada_vidro_brise", prompt_fragment: "glass facade with brise-soleil elements" },
    ],
    engineering_rules: {
      foundation: "sapatas_enterradas_blocos_abaixo_piso",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["blocos_academicos", "circulacoes_cobertas", "areas_convivencia"],
    },
    incompatibilities: [],
  },

  hospital: {
    context_type: "hospital",
    name: "Hospital",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "via_urbana_principal", prompt_fragment: "main urban access road in front of building", weight: 3 },
      { id: "area_urbana_mista", prompt_fragment: "mixed urban surroundings with nearby buildings", weight: 2 },
    ],
    landscaping: [
      { id: "jardim_acesso", prompt_fragment: "landscaped garden at main entrance", weight: 3 },
      { id: "area_verde_perimetral", prompt_fragment: "green buffer area around building perimeter", weight: 2 },
    ],
    humanization: [
      { id: "pessoas_entrada_genericas", prompt_fragment: "people near main entrance, generic non-identifiable figures", weight: 2 },
      { id: "fluxo_baixo", prompt_fragment: "low pedestrian flow", weight: 2 },
    ],
    vehicles: [
      { id: "estacionamento_visitantes", prompt_fragment: "visitor parking area, partially occupied", weight: 3 },
      { id: "ambulancia", prompt_fragment: "an ambulance parked near emergency entrance", weight: 1 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "sol_suave_difuso", prompt_fragment: "soft diffused sunlight", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "meio_dia", prompt_fragment: "midday light", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_acesso", prompt_fragment: "trees framing main access area", weight: 2 },
      { id: "jardins_baixos", prompt_fragment: "low decorative garden beds", weight: 2 },
    ],
    predominant_materials: [
      { id: "fachada_vidro_aco", prompt_fragment: "glass and steel facade elements" },
      { id: "concreto_estrutural", prompt_fragment: "exposed structural concrete" },
    ],
    engineering_rules: {
      foundation: "sapatas_ou_radier_conforme_projeto",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["bloco_principal", "acesso_emergencia"],
    },
    incompatibilities: [
      { if: "fluxo_baixo", excludes: ["pessoas_entrada_genericas"] },
    ],
  },

  edificio_corporativo: {
    context_type: "edificio_corporativo",
    name: "Edifício Corporativo",
    camera: CAMERA_DEFAULT,
    urban_context: [
      { id: "centro_negocios", prompt_fragment: "business district with other office buildings", weight: 3 },
      { id: "avenida_principal", prompt_fragment: "busy main avenue in front of building", weight: 2 },
    ],
    landscaping: [
      { id: "praca_pavimentada", prompt_fragment: "paved plaza at building entrance", weight: 3 },
      { id: "jardins_baixos_entrada", prompt_fragment: "low landscaped beds near entrance", weight: 2 },
    ],
    humanization: [
      { id: "executivos_entrada", prompt_fragment: "people in business attire near entrance, generic non-identifiable", weight: 3 },
      { id: "fluxo_moderado_pedestres", prompt_fragment: "moderate pedestrian flow on sidewalk", weight: 2 },
    ],
    vehicles: [
      { id: "carros_via_movimento", prompt_fragment: "cars moving along the avenue", weight: 3 },
      { id: "acesso_subsolo", prompt_fragment: "visible underground parking entrance ramp", weight: 1 },
    ],
    lighting: [
      { id: "luz_natural_ampla", prompt_fragment: "bright natural daylight", weight: 3 },
      { id: "reflexos_vidro", prompt_fragment: "sunlight reflecting off glass facade", weight: 2 },
    ],
    weather: [
      { id: "ceu_limpo", prompt_fragment: "clear sky", weight: 3 },
      { id: "parcialmente_nublado", prompt_fragment: "partly cloudy sky", weight: 2 },
    ],
    time_of_day: [
      { id: "manha", prompt_fragment: "morning light", weight: 3 },
      { id: "fim_tarde_dourado", prompt_fragment: "golden hour late afternoon", weight: 2 },
    ],
    vegetation: [
      { id: "arvores_urbanas_alinhadas", prompt_fragment: "aligned urban trees along sidewalk", weight: 2 },
    ],
    predominant_materials: [
      { id: "fachada_vidro_cortina", prompt_fragment: "glass curtain wall facade" },
      { id: "estrutura_concreto_aco", prompt_fragment: "exposed concrete or steel structural elements" },
      { id: "brise_metalico", prompt_fragment: "metal brise-soleil sun shading elements" },
    ],
    engineering_rules: {
      foundation: "sapatas_ou_radier_conforme_projeto",
      visible_elements_allowed: ["chapa_base", "chumbadores", "graute"],
      mandatory_elements: ["torre_principal", "fachada_cortina", "acesso_terreo"],
    },
    incompatibilities: [],
  },
};

export const GLOBAL_SAFETY_RULES = {
  no_real_brand_logos: true,
  no_identifiable_real_people: true,
  no_real_license_plates: true,
  generic_human_figures_only: true,
  safety_prompt_fragment:
    "No real brand logos or commercial signage. No identifiable real people. Generic human figures only. No real license plates.",
};
