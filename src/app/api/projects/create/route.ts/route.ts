import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // setAll pode falhar em Server Components — ignorar
            }
          },
        },
      }
    )

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login novamente.' },
        { status: 401 }
      )
    }

    // Ler FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = (formData.get('description') as string) || null
    const file = formData.get('file') as File | null

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome do projeto é obrigatório.' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório.' },
        { status: 400 }
      )
    }

    // Validar tipo do arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPG, PNG ou PDF.' },
        { status: 400 }
      )
    }

    // Validar tamanho (50 MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Limite de 50 MB.' },
        { status: 400 }
      )
    }

    // 1. Criar o projeto no banco
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        status: 'uploaded',
      })
      .select()
      .single()

    if (projectError || !project) {
      console.error('[create/route] Erro ao criar projeto:', projectError)
      return NextResponse.json(
        { error: 'Não foi possível criar o projeto no banco de dados.' },
        { status: 500 }
      )
    }

    // 2. Upload do arquivo no Storage
    // Estrutura de pasta: {userId}/{projectId}/{timestamp}_{filename}
    const ext = file.name.split('.').pop() || 'bin'
    const timestamp = Date.now()
    const storagePath = `${user.id}/${project.id}/${timestamp}_${file.name}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Rollback: remover o projeto criado
      console.error('[create/route] Erro no upload:', uploadError)
      await supabase.from('projects').delete().eq('id', project.id)
      return NextResponse.json(
        { error: 'Falha no upload do arquivo. Tente novamente.' },
        { status: 500 }
      )
    }

    // 3. Registrar o arquivo na tabela project_files
    const fileType = ext.toLowerCase() as 'jpg' | 'jpeg' | 'png' | 'pdf'
    const validFileTypes = ['jpg', 'jpeg', 'png', 'pdf', 'ifc', 'dwg']
    const resolvedType = validFileTypes.includes(fileType) ? fileType : 'pdf'

    const { error: fileRecordError } = await supabase.from('project_files').insert({
      project_id: project.id,
      file_type: resolvedType,
      storage_path: storagePath,
      original_filename: file.name,
      size_bytes: file.size,
    })

    if (fileRecordError) {
      // Não é crítico — projeto e arquivo já estão salvos
      console.warn('[create/route] Aviso: não registrou project_files:', fileRecordError)
    }

    // Sucesso
    return NextResponse.json(
      {
        success: true,
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[create/route] Erro inesperado:', err)
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 }
    )
  }
}
