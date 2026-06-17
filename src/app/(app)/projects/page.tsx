import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  uploaded:     { label: "Enviado",           color: "bg-slate-100 text-slate-700" },
  analyzing:    { label: "Analisando...",      color: "bg-amber-100 text-amber-800" },
  analyzed:     { label: "Analise concluida", color: "bg-green-100 text-green-800" },
  approved:     { label: "Aprovado",           color: "bg-blue-100 text-blue-800" },
  prompt_ready: { label: "Prompt gerado",      color: "bg-purple-100 text-purple-800" },
  error:        { label: "Erro",               color: "bg-red-100 text-red-800" },
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historico</h1>
          <p className="mt-1 text-sm text-slate-500">
            {projects?.length ?? 0} projeto{projects?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          + Novo Projeto
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center">
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          <p className="mt-3 text-sm text-slate-500">Nenhum projeto ainda.</p>
          <Link
            href="/projects/new"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Criar primeiro projeto
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {projects.map((project) => {
            const statusInfo = STATUS_LABEL[project.status] ?? { label: project.status, color: "bg-slate-100 text-slate-600" };
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(project.created_at).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
