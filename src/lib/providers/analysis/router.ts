/**
 * ProviderRouter — camada de roteamento de providers
 *
 * Resolve qual AnalysisProvider usar com base em:
 * 1. `provider_routing_rules` no banco (configuração administrativa)
 * 2. Fallback para configuração padrão se banco indisponível
 *
 * Toda chamada ao pipeline passa por aqui — nunca instanciar adapters
 * diretamente no código de negócio.
 */

import type { AnalysisProvider } from "./types";
import { ClaudeSonnetAdapter } from "./claude-sonnet";

export type PipelineStage =
  | "technical_analysis"
  | "quality_control"
  | "render"
  | "upscale";

/**
 * Mapa estático de provider_key → factory.
 * Adicionar novo provider = adicionar entrada aqui + arquivo de adapter.
 */
const PROVIDER_FACTORIES: Record<string, () => AnalysisProvider> = {
  "claude-sonnet": () => new ClaudeSonnetAdapter(),
};

/**
 * Retorna o Analysis Provider configurado para um dado estágio do pipeline.
 *
 * No MVP usa o provider padrão (claude-sonnet) sem consultar o banco,
 * pois há apenas um provider ativo. Na Fase 2 este método consulta
 * `provider_routing_rules` para suportar múltiplos providers com fallback.
 */
export function resolveAnalysisProvider(
  _stage: PipelineStage = "technical_analysis"
): AnalysisProvider {
  // MVP: sempre retorna claude-sonnet.
  // Fase 2: ler provider_routing_rules do banco e instanciar dinamicamente.
  const providerKey = process.env.ANALYSIS_PROVIDER_KEY ?? "claude-sonnet";

  const factory = PROVIDER_FACTORIES[providerKey];
  if (!factory) {
    throw new Error(
      `Provider "${providerKey}" nao encontrado. Verifique ANALYSIS_PROVIDER_KEY.`
    );
  }

  return factory();
}
