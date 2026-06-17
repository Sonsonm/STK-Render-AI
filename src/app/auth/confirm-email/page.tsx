import Link from "next/link";

export default function ConfirmEmailPage() {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-7 w-7 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Confirme seu email</h2>
        <p className="mt-2 text-sm text-slate-500">
          Enviamos um link de confirmação para o seu email.
          Clique no link para ativar sua conta e acessar a plataforma.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        Não recebeu?{" "}
        <Link href="/signup" className="font-medium text-slate-900 hover:underline">
          Tentar novamente
        </Link>
      </p>

      <Link
        href="/login"
        className="block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Voltar para o login
      </Link>
    </div>
  );
}
