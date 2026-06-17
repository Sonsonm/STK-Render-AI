/**
 * POST /api/projects/[id]/analyze
 *
 * Dispara o pipeline de análise técnica para um projeto.
 * Protegido: apenas o dono do projeto pode disparar.
 *
 * Execução assíncrona no MVP: a requisição retorna imediatamente
 * e o pipeline roda em background via `void` (Next.js serverless).
 * Fase 2: mover para queue (Inngest/Trigger.dev) para robustez.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysisPipeline } from "@/lib/pipeline/analysis-pipeline";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  // Verificar ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
  }

  if (!["uploaded", "error"].includes(project.status)) {
    return NextResponse.json(
      { error: `Projeto em status '${project.status}' nao pode ser analisado.` },
      { status: 409 }
    );
  }

  // Disparar pipeline em background (não aguarda conclusão)
  // O cliente faz polling no status do projeto para saber quando termina.
  void runAnalysisPipeline(projectId);

  return NextResponse.json({
    ok: true,
    message: "Analise iniciada.",
    projectId,
  });
}
