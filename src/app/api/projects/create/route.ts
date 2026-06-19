/**
 * POST /api/projects/create
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
    }

    // Ler FormData
    const formData = await request.formData();
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string | null) ?? null;
    const file = formData.get("file") as File | null;

    // Validações
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nome do projeto e obrigatorio." },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo e obrigatorio." },
        { status: 400 }
      );
    }

    const fileExt = ALLOWED_MIME_TYPES[file.type];
    if (!fileExt) {
      return NextResponse.json(
        { error: "Tipo de arquivo nao suportado. Use JPG, PNG ou PDF." },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Limite de 50 MB." },
        { status: 400 }
      );
    }

    // 1. Criar projeto
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        status: "uploaded",
      })
      .select()
      .single();

    if (projectError || !project) {
      console.error("[projects/create] Erro ao inserir projeto:", projectError);
      return NextResponse.json(
        { error: "Nao foi possivel criar o projeto." },
        { status: 500 }
      );
    }

    // 2. Upload do arquivo
    const safeFilename = sanitizeFilename(file.name);
    const timestamp = Date.now();
    const storagePath = `${user.id}/${project.id}/${timestamp}_${safeFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[projects/create] Erro no upload:", uploadError);
      // Rollback
      await supabase.from("projects").delete().eq("id", project.id);
      return NextResponse.json(
        { error: "Falha no upload do arquivo. Tente novamente." },
        { status: 500 }
      );
    }

    // 3. Registrar em project_files
    const { error: fileRecordError } = await supabase
      .from("project_files")
      .insert({
        project_id: project.id,
        file_type: fileExt,
        storage_path: storagePath,
        original_filename: file.name,
        size_bytes: file.size,
      });

    if (fileRecordError) {
      console.warn("[projects/create] Aviso ao registrar project_files:", fileRecordError);
    }

    // Retorna projectId no nível raiz (esperado pelo page.tsx)
    return NextResponse.json(
      {
        ok: true,
        projectId: project.id,
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[projects/create] Erro inesperado:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor. Tente novamente." },
      { status: 500 }
    );
  }
}
