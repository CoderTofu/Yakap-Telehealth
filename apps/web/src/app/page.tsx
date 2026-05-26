export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-20">
        <div className="mb-6 inline-flex w-fit items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm text-sky-200">
          Yakap monorepo scaffold
        </div>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
          Next.js frontend, Express API, and PostgreSQL are wired up.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Use <span className="text-sky-300">/api/health</span> to reach the
          backend through the Next.js rewrite and keep building from the shared
          TypeScript package.
        </p>
      </section>
    </main>
  );
}
