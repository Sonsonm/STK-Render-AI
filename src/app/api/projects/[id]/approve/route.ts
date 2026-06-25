import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runPromptPipeline } from "@/lib/pipeline/prompt-pipeline";
export const maxDuration = 60;
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return NextResponse.json({ error: "Nao autenticado." }, { status: 401 }); }
  const { data: project } = await supabase.from("projects").select("id, status, user_id").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) { return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 }); }
  if (project.status !== "analyzed") { return NextResponse.json({ error: "Projeto precisa estar analyzed para aprovar. Status: " + project.status }, { status: 409 }); }
  await supabase.from("projects").update({ status: "approved" }).eq("id", projectId);
  try {
    await runPromptPipeline(projectId);
    return NextResponse.json({ ok: true, message: "Prompt gerado.", projectId });
  } catch (err) {
    console.error("[approve] Falha no prompt pipeline:", err);
    return NextResponse.json({ ok: false, error: "Falha no prompt pipeline." }, { status: 500 });
  }
}
