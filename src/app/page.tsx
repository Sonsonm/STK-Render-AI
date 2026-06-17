import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        STK Render AI
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        Análise técnica de projetos estruturais metálicos e de concreto,
        com fidelidade absoluta à geometria original.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
