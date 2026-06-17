export default function AuthUtilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">STK Render AI</h1>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          {children}
        </div>
      </div>
    </main>
  );
}
