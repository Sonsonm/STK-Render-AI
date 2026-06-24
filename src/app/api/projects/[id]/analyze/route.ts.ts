//**
 * POST /api/projects/[id]/analyze
 *
 * Dispara o pipeline de análise técnica para um projeto.
 * Protegido: apenas o dono do projeto pode disparar.
 *
 * Execução em background via `after()` do Next.js: a requisição retorna
 * imediatamente e o pipeline continua rodando após a resposta. A Vercel
 * mantém a função viva até o pipeline terminar (limitado por maxDuration).
 * O cliente faz polling no status do projeto para saber quando termina.
 */

import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysisPipeline } from "@/lib/pipeline/analysis-pipeline";

// Mantém a função viva por até 60s para o pipeline rodar em background.
export const maxDuration = 60;

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

  // Roda o pipeline APÓS a resposta ser enviada. A Vercel mantém a função
  // viva até a promise terminar (diferente de `void`, que era morto no return).
  after(async () => {
    try {
      await runAnalysisPipeline(projectId);
    } catch (err) {
      console.error(`[analyze] Falha no pipeline do projeto ${projectId}:`, err);
    }
  });

  return NextResponse.json({
    ok: true,
    message: "Analise iniciada.",
    projectId,
  });
}