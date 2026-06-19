"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { runAnalysisPipeline } from "@/lib/pipeline/analysis-pipeline";
import type { FileType } from "@/types/database";

export interface CreateProjectActionResult {
  error?: string;
  fieldErrors?: {
    name?: string;
    file?: string;
  };
}

const ALLOWED_MIME_TYPES: Record<string, FileType> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export async function createProject(
  _prevState: CreateProjectActionResult | undefined,
  formData: FormData
): Promise<CreateProjectActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessao expirada. Faca login novamente." };

  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file") as File | null;

  const fieldErrors: CreateProjectActionResult["fieldErrors"] = {};

  if (!name) fieldErrors.name = "Nome do projeto e obrigatorio.";
  else if (name.length < 3) fieldErrors.name = "Nome deve ter pelo menos 3 caracteres.";
  else if (name.length > 120) fieldErrors.name = "Nome muito longo (max 120 caracteres).";

  if (!file || file.size === 0) fieldErrors.file = "Selecione um arquivo.";
  else if (!ALLOWED_MIME_TYPES[file.type]) fieldErrors.file = "Formato nao suportado. Envie JPG, PNG ou PDF.";
  else if (file.size > MAX_FILE_SIZE) fieldErrors.file = "Arquivo muito grande. Maximo 50 MB.";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const fileType = ALLOWED_MIME_TYPES[file!.type];

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name, status: "uploaded" })
    .select("id")
    .single();

  if (projectError || !project) {
    return { error: "Nao foi possivel criar o projeto. Tente novamente." };
  }

  const safeFilename = sanitizeFilename(file!.name);
  const timestamp = Date.now();
  const storagePath = `${user.id}/${project.id}/${timestamp}_${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(storagePath, file!, { contentType: file!.type, upsert: false });

  if (uploadError) {
    await supabase.from("projects").delete().eq("id", project.id);
    return { error: "Falha ao enviar o arquivo. Verifique sua conexao e tente novamente." };
  }

  const { error: fileError } = await supabase.from("project_files").insert({
    project_id: project.id,
    file_type: fileType,
    storage_path: storagePath,
    original_filename: file!.name,
    size_bytes: file!.size,
  });

  if (fileError) {
    return { error: "Arquivo enviado, mas houve erro ao registra-lo." };
  }

  // Disparar pipeline de analise automaticamente em background
  void runAnalysisPipeline(project.id);

  redirect(`/projects/${project.id}`);
}
