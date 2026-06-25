import { NextResponse } from "next/server";
export const maxDuration = 60;
export async function GET() {
  const r: Record<string, unknown> = {};
  r["env"] = { URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL, SRK: !!process.env.SUPABASE_SERVICE_ROLE_KEY, ANTH: !!process.env.ANTHROPIC_API_KEY };
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    const sb = createServiceRoleClient();
    r["client"] = "OK";
    const { data: p, error: e1 } = await sb.from("projects").select("id,name,status").eq("status","uploaded").limit(1).single();
    if (e1 || !p) { r["project"] = e1?.message ?? "nenhum"; return NextResponse.json(r); }
    r["project"] = { id: p.id, name: p.name };
    const { data: f, error: e2 } = await sb.from("project_files").select("id,storage_path,file_type,original_filename").eq("project_id",p.id);
    if (e2 || !f?.length) { r["files"] = e2?.message ?? "sem arquivos"; return NextResponse.json(r); }
    r["files"] = f[0].original_filename;
    const { data: bl, error: e3 } = await sb.storage.from("uploads").download(f[0].storage_path);
    if (e3 || !bl) { r["storage"] = e3?.message ?? "blob nulo"; return NextResponse.json(r); }
    r["storage"] = Math.round((await (bl as Blob).arrayBuffer()).byteLength/1024)+"KB";
    const { resolveAnalysisProvider } = await import("@/lib/providers/analysis/router");
    r["provider"] = resolveAnalysisProvider("technical_analysis").id;
    const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY!,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1,messages:[{role:"user",content:"ping"}]})});
    r["anthropic"] = res.ok ? "OK" : res.status+": "+(await res.text()).slice(0,200);
  } catch(e) { r["erro"] = String(e); }
  return NextResponse.json(r);
}
