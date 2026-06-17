"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ProjectStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "approved"
  | "prompt_ready"
  | "error";

interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  created_at: string;
}

interface ProjectFile {
  id: string;
  original_filename: string;
  file_type: string;
  size_bytes: number | null;
}

interface TechnicalAnalysis {
  id: string;
  raw_report: string;
  structured_json: Record<string, unknown>;
  structure_type: string | null;
}

interface PromptData {
  id: string;
  final_prompt: string;
  scenario_variant_used: Record<string, unknown>;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; dotColor: string; textColor: string; description: string; pulse?: boolean }
> = {
  uploaded: {
    label: "Enviado",
    dotColor: "bg-slate-400",
    textColor: "text-slate-700",
    description: "Arquivo recebido. Iniciando analise tecnica...",
    pulse: true,
  },
  analyzing: {
    label: "Analisando projeto...",
    dotColor: "bg-amber-500",
    textColor: "text-amber-700",
    description: "A IA esta interpretando o projeto estrutural. Isso pode levar alguns instantes.",
    pulse: true,
  },
  analyzed: {
    label: "Analise concluida",
    dotColor: "bg-green-500",
    textColor: "text-green-700",
    description: "Analise tecnica concluida. Revise o relatorio e aprove para gerar o prompt de renderizacao.",
  },
  approved: {
    label: "Aprovado — gerando prompt...",
    dotColor: "bg-blue-500",
    textColor: "text-blue-700",
    description: "Analise aprovada. O Engineering Core esta montando o prompt de renderizacao.",
    pulse: true,
  },
  prompt_ready: {
    label: "Prompt gerado",
    dotColor: "bg-purple-500",
    textColor: "text-purple-700",
    description: "Prompt de renderizacao gerado com fidelidade estrutural total. MVP concluido.",
  },
  error: {
    label: "Erro no processamento",
    dotColor: "bg-red-500",
    textColor: "text-red-700",
    description: "Ocorreu um erro. Voce pode tentar reenviar o arquivo ou contatar o suporte.",
  },
};

const POLLING_STATUSES: ProjectStatus[] = ["uploaded", "analyzing", "approved"];
const POLL_INTERVAL = 3500;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 border border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function LockBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-green-700">
      <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
      {label}
    </div>
  );
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [analysis, setAnalysis] = useState<TechnicalAnalysis | null>(null);
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supabase = createClient();

  const loadAll = useCallback(async () => {
    const { data: proj, error } = await supabase
      .from("projects")
      .select("id, name, status, created_at")
      .eq("id", projectId)
      .single();

    if (error || !proj) {
      router.replace("/dashboard");
      return;
    }

    setProject(proj as Project);

    const { data: fileData } = await supabase
      .from("project_files")
      .select("id, original_filename, file_type, size_bytes")
      .eq("project_id", projectId);
    setFiles((fileData as ProjectFile[]) ?? []);

    if (["analyzed", "approved", "prompt_ready"].includes(proj.status)) {
      const { data: a } = await supabase
        .from("technical_analysis")
        .select("id, raw_report, structured_json, structure_type")
        .eq("project_id", projectId)
        .single();
      setAnalysis((a as TechnicalAnalysis) ?? null);
    }

    if (proj.status === "prompt_ready") {
      const { data: p } = await supabase
        .from("prompts")
        .select("id, final_prompt, scenario_variant_used")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setPrompt((p as PromptData) ?? null);
    }

    setLoading(false);
    return proj.status as ProjectStatus;
  }, [projectId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Polling para estados em transicao
  useEffect(() => {
    if (!project) return;
    if (!POLLING_STATUSES.includes(project.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(loadAll, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [project?.status, loadAll]);

  async function handleApprove() {
    if (!project || approving) return;
    setApproving(true);
    setApproveError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Erro desconhecido.");
      }
      await loadAll();
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Erro ao aprovar.");
    } finally {
      setApproving(false);
    }
  }

  async function handleCopyPrompt() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.final_prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  async function handleRetry() {
    if (!project) return;
    await fetch(`/api/projects/${project.id}/analyze`, { method: "POST" });
    await loadAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="h-6 w-6 animate-spin text-slate-300" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>
    );
  }

  if (!project) return null;

  const sc = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.uploaded;
  const ejson = analysis?.structured_json as Record<string, unknown> | undefined;
  const elements = ejson?.elements as Record<string, unknown> | undefined;
  const pillars = elements?.pillars as { count: number } | undefined;
  const roof = elements?.roof as { type: string } | undefined;
  const modulation = ejson?.modulation as { module_count: number; module_dimensions_estimate: string } | undefined;
  const confidence = ejson?.confidence as { overall: number; notes: string } | undefined;
  const lock = ejson?.engineering_lock as Record<string, boolean> | undefined;

  const scenarioKeys = ["lighting", "weather", "time_of_day", "vehicles", "urban_context"];
  const scenarioSummary = prompt
    ? scenarioKeys
        .map((k) => prompt.scenario_variant_used[k])
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard" className="mt-1.5 shrink-0 text-slate-400 hover:text-slate-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">{project.name}</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(project.created_at).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${sc.dotColor} ${sc.pulse ? "animate-pulse" : ""}`} />
          <span className={`text-sm font-semibold ${sc.textColor}`}>{sc.label}</span>
        </div>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{sc.description}</p>

        {project.status === "analyzed" && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {approving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Aprovando...
                </>
              ) : (
                <>
                  Aprovar e gerar prompt
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
            {approveError && <p className="text-sm text-red-600">{approveError}</p>}
          </div>
        )}

        {project.status === "error" && (
          <button
            onClick={handleRetry}
            className="mt-4 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Tentar novamente
          </button>
        )}
      </div>

      {/* Arquivos */}
      {files.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Arquivos
          </h2>
          <ul className="divide-y divide-slate-100">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <span className="truncate text-sm text-slate-700">{f.original_filename}</span>
                </div>
                <div className="ml-4 flex items-center gap-2 shrink-0">
                  {f.size_bytes != null && (
                    <span className="text-xs text-slate-400">{formatBytes(f.size_bytes)}</span>
                  )}
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-500">
                    {f.file_type}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analise Tecnica */}
      {analysis && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Analise tecnica
          </h2>

          {/* Metricas */}
          {ejson && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="Estrutura" value={
                ejson.structure_type === "metalica" ? "Metalica" :
                ejson.structure_type === "concreto" ? "Concreto" : "Mista"
              } />
              <MetricCard label="Pilares" value={pillars?.count ?? "—"} />
              <MetricCard label="Modulos" value={modulation?.module_count ?? "—"} />
              <MetricCard
                label="Confianca"
                value={confidence ? `${Math.round(confidence.overall * 100)}%` : "—"}
              />
            </div>
          )}

          {/* Cobertura + Dimensoes */}
          {(roof?.type || modulation?.module_dimensions_estimate) && (
            <div className="grid grid-cols-2 gap-3">
              {roof?.type && <MetricCard label="Cobertura" value={roof.type} />}
              {modulation?.module_dimensions_estimate && (
                <MetricCard label="Dimensoes estimadas" value={modulation.module_dimensions_estimate} />
              )}
            </div>
          )}

          {/* Relatorio textual */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
              Relatorio tecnico
            </p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {analysis.raw_report}
            </p>
          </div>

          {/* JSON expansivel */}
          <div>
            <button
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <svg
                className={`h-3 w-3 transition-transform ${jsonExpanded ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              {jsonExpanded ? "Ocultar" : "Ver"} EngineeringJSON completo
            </button>

            {jsonExpanded && (
              <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs leading-relaxed text-slate-200 max-h-80 overflow-y-auto">
                {JSON.stringify(analysis.structured_json, null, 2)}
              </pre>
            )}
          </div>

          {/* Aprovacao (se ainda nao aprovado) */}
          {project.status === "analyzed" && (
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Verifique o relatorio antes de aprovar.
              </p>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {approving ? "Aprovando..." : "Aprovar analise"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Prompt Builder */}
      {prompt && (
        <div className="rounded-lg border border-purple-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-500">
              Prompt Builder — gerado pelo Engineering Core
            </h2>
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              {promptCopied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                  </svg>
                  Copiar
                </>
              )}
            </button>
          </div>

          {/* Prompt textual */}
          <div className="rounded-md bg-purple-50 border border-purple-100 p-4">
            <p className="text-sm text-purple-900 leading-relaxed">{prompt.final_prompt}</p>
          </div>

          {/* Cenario selecionado */}
          {scenarioSummary && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Cenario selecionado
              </p>
              <p className="text-xs text-slate-600">{scenarioSummary}</p>
            </div>
          )}

          {/* Engineering Lock */}
          {lock && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                Engineering Lock aplicado
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 sm:grid-cols-3">
                {lock.geometry_locked && <LockBadge label="Geometria preservada" />}
                {lock.pillar_locked && <LockBadge label="Pilares preservados" />}
                {lock.modulation_locked && <LockBadge label="Modulacao preservada" />}
                {lock.roof_locked && <LockBadge label="Cobertura preservada" />}
                {lock.span_locked && <LockBadge label="Vaos preservados" />}
              </div>
            </div>
          )}

          {/* CTA Fase 2 */}
          <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Pronto para renderizacao</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Geracao de render disponivel na V1 Comercial (Fase 2).
              </p>
            </div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Em breve
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
