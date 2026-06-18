"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  function handleFileChange(file: File | null) {
    if (!file) { setSelectedFile(null); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Formato nao suportado. Use JPG, PNG ou PDF.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Arquivo muito grande. Maximo 50 MB.");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  async function handleSubmit() {
    const name = nameRef.current?.value?.trim() ?? "";
    if (!name) { setError("Nome do projeto e obrigatorio."); return; }
    if (!selectedFile) { setError("Selecione um arquivo."); return; }

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao criar projeto.");
        setPending(false);
        return;
      }
      router.push(`/projects/${data.projectId}`);
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Novo Projeto</h1>
          <p className="text-sm text-slate-500">Envie uma imagem ou PDF do projeto estrutural.</p>
        </div>
      </div>

      <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Nome do projeto <span className="text-red-500">*</span>
          </label>
          <input
            ref={nameRef}
            type="text"
            disabled={pending}
            placeholder="Ex: Galpao Logistico - Cliente XYZ"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Arquivo <span className="text-red-500">*</span>
          </label>

          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFileChange(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`mt-1 cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver ? "border-slate-500 bg-slate-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-700">Clique para selecionar ou arraste aqui</p>
              <p className="mt-1 text-xs text-slate-400">JPG, PNG ou PDF — max 50 MB</p>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
              </div>
              <button type="button" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="rounded p-1 text-slate-400 hover:bg-slate-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="sr-only"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !selectedFile}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Enviando...
            </>
          ) : "Enviar e Criar Projeto"}
        </button>
      </div>
    </div>
  );
}