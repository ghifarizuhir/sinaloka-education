export function InstitutionNotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <span className="text-2xl">?</span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Institusi tidak ditemukan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Subdomain yang Anda akses tidak terdaftar di Sinaloka.
        </p>
        <a
          href="https://sinaloka.com"
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100 underline hover:no-underline"
        >
          Kunjungi sinaloka.com
        </a>
      </div>
    </div>
  );
}
