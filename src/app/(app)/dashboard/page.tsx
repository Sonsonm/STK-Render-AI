import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "Enviado",
  analyzing: "Analisando...",
  analyzed: "Análise concluída",
  approved: "Aprovado",
  prompt_ready: "Prompt gerado",
  error: "Erro",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Meus Projetos</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Novo Projeto
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-slate-500">
            Você ainda não enviou nenhum projeto.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Enviar primeiro projeto
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-4 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(project.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {STATUS_LABEL[project.status] ?? project.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
