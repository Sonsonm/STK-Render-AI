/**
 * RenderProvider — Contrato comum a todos os providers de renderização
 * (Fable, Nano Banana, Flux, Stable Diffusion, Recraft, Ideogram, Midjourney...).
 *
 * Não utilizado na Fase 1 (MVP). Estrutura criada antecipadamente para
 * manter a arquitetura provider-agnostic desde o início.
 *
 * Implementação real: Sprint 9 (Fase 2).
 */

export type RenderCapability = "text_to_image" | "image_to_image" | "controlnet" | "upscale";

export interface RenderProvider {
  id: string;
  capabilities: RenderCapability[];
  costTier: "low" | "medium" | "high";
  maxResolution: string;
}
