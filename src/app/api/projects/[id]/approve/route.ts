/**
 * POST /api/projects/[id]/approve
 *
 * Aprova a análise técnica de um projeto e dispara o Prompt Pipeline.
 * Protegido: apenas o dono do projeto pode aprovar.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPromptPipeline } from "@/lib/pipeline/prompt-pipeline";

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

  // Verificar ownership e status
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
  }

  if (project.status !== "analyzed") {
    return NextResponse.json(
      {
        error: `Projeto precisa estar com status 'analyzed' para aprovar. Status atual: '${project.status}'.`,
      },
      { status: 409 }
    );
  }

  // Marcar como approved imediatamente para o cliente ver a transição
  await supabase
    .from("projects")
    .update({ status: "approved" })
    .eq("id", projectId);

  // Rodar Prompt Pipeline em background
  void runPromptPipeline(projectId);

  return NextResponse.json({
    ok: true,
    message: "Aprovacao registrada. Gerando prompt...",
    projectId,
  });
}
