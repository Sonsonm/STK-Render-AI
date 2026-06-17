-- =============================================================================
-- STK Render AI — Seed Data (Sprint 0)
-- =============================================================================
-- Popula apenas o necessário para o app não quebrar:
-- 1 Analysis Provider (placeholder, sem chamadas reais ainda)
-- 1 Routing Rule para o estágio "technical_analysis"
-- Scenario Library: 1 contexto de exemplo (galpao_industrial)
--
-- A análise técnica real (Sprint 4) só usará esses registros para resolver
-- qual provider chamar - nesta Sprint 0 nada é executado de fato.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- AI PROVIDERS
-- -----------------------------------------------------------------------------
insert into public.ai_providers (
  provider_key, category, display_name, capabilities, cost_tier,
  cost_per_unit, cost_unit, active, priority, config
) values (
  'claude-sonnet',
  'analysis',
  'Claude Sonnet (Anthropic)',
  array['vision_triage', 'technical_report', 'json_extraction'],
  'medium',
  0.000003,
  'per_token',
  true,
  1,
  jsonb_build_object(
    'model_version', 'claude-sonnet-4-6',
    'timeout_ms', 60000,
    'max_retries', 2
  )
)
on conflict (provider_key) do nothing;

-- -----------------------------------------------------------------------------
-- PROVIDER ROUTING RULES
-- -----------------------------------------------------------------------------
insert into public.provider_routing_rules (
  pipeline_stage, primary_provider_id, active
)
select
  'technical_analysis',
  id,
  true
from public.ai_providers
where provider_key = 'claude-sonnet'
on conflict (pipeline_stage) do nothing;

-- -----------------------------------------------------------------------------
-- SCENARIO LIBRARY (exemplo mínimo - galpão industrial)
-- A biblioteca completa (11 contextos) é populada via seed dedicado
-- na Sprint 3 (Engineering Core).
-- -----------------------------------------------------------------------------
insert into public.scenario_library (
  context_type, name, active, version, description, data, weight
) values (
  'galpao_industrial',
  'Galpão Industrial - Padrão',
  true,
  1,
  'Cenário padrão para galpões industriais isolados ou em zonas logísticas.',
  jsonb_build_object(
    'camera', jsonb_build_object(
      'default_views', jsonb_build_array(
        jsonb_build_object('id', 'external_front_3quarter', 'prompt_fragment', 'wide three-quarter front exterior view, eye-level perspective', 'weight', 3)
      ),
      'framing_rules', jsonb_build_array(
        'always_show_full_structure_height',
        'do_not_crop_roofline'
      )
    ),
    'urban_context', jsonb_build_array(
      jsonb_build_object('id', 'via_acesso_asfaltada', 'prompt_fragment', 'paved access road leading to the facility', 'weight', 3)
    ),
    'landscaping', jsonb_build_array(
      jsonb_build_object('id', 'grama_perimetral_baixa', 'prompt_fragment', 'low-cut grass strip along the building perimeter', 'weight', 3)
    ),
    'humanization', jsonb_build_array(
      jsonb_build_object('id', 'sem_pessoas', 'prompt_fragment', 'no people visible', 'weight', 2)
    ),
    'vehicles', jsonb_build_array(
      jsonb_build_object('id', 'carretas_nas_docas', 'prompt_fragment', 'several semi-trailer trucks parked at the loading docks', 'weight', 3)
    ),
    'lighting', jsonb_build_array(
      jsonb_build_object('id', 'luz_natural_difusa', 'prompt_fragment', 'soft diffused natural daylight', 'weight', 3)
    ),
    'weather', jsonb_build_array(
      jsonb_build_object('id', 'ceu_limpo', 'prompt_fragment', 'clear blue sky', 'weight', 3)
    ),
    'time_of_day', jsonb_build_array(
      jsonb_build_object('id', 'manha', 'prompt_fragment', 'morning light', 'weight', 3)
    ),
    'vegetation', jsonb_build_array(
      jsonb_build_object('id', 'arvores_esparsas_fundo', 'prompt_fragment', 'sparse trees in the background', 'weight', 2)
    ),
    'predominant_materials', jsonb_build_array(
      jsonb_build_object('id', 'telha_metalica_galvanizada', 'prompt_fragment', 'galvanized metal roofing and wall panels')
    ),
    'engineering_rules', jsonb_build_object(
      'foundation', 'sapatas_enterradas_blocos_abaixo_piso',
      'visible_elements_allowed', jsonb_build_array('chapa_base', 'chumbadores', 'graute'),
      'mandatory_elements', jsonb_build_array('pilares_metalicos', 'vigas', 'terças', 'cobertura_metalica')
    ),
    'structural_fidelity_constraints', jsonb_build_object(
      'geometry_locked', true,
      'roof_locked', true,
      'pillar_locked', true,
      'span_locked', true,
      'modulation_locked', true
    ),
    'incompatibilities', jsonb_build_array()
  ),
  1.0
)
on conflict (context_type) do nothing;
