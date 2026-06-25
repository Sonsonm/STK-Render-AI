/**
 * POST /api/projects/[id]/analyze
 *
 * Dispara o pipeline de análise técnica para um projeto.
 * Protegido: apenas o dono do projeto pode disparar.
 *
 * O pipeline roda de forma síncrona (await). O front dispara este
 * fetch sem await, então a UI não bloqueia. maxDuration garante
 * que a Vercel mantém a função viva até o pipeline terminar.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runAnalysisPipeline } from "@/lib/pipeline/analysis-pipeline";

// Mantém a função viva por até 60s para o pipeline completar.
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

  // Roda o pipeline diretamente (await). O front chama sem await,
  // entao a UI nao bloqueia. O polling detecta mudancas de status.
  try {
    await runAnalysisPipeline(projectId);
    return NextResponse.json({
      ok: true,
      message: "Analise concluida.",
      projectId,
    });
  } catch (err) {
    console.error(`[analyze] Falha no pipeline do projeto ${projectId}:`, err);
    return NextResponse.json(
      { ok: false, error: "Falha no pipeline de analise." },
      { status: 500 }
    );
  }
}
