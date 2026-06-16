const STACK = [
  { label: 'Next.js 16', note: 'App Router · RSC' },
  { label: 'Neon Postgres', note: 'serverless' },
  { label: 'Drizzle ORM', note: 'typed schema + migrations' },
  { label: 'Auth.js v5', note: 'admin / staff (Phase 1)' },
  { label: 'Tailwind 4', note: 'dark-first' },
  { label: 'Biome', note: 'lint + format' },
];

const PHASES = [
  { id: '0', name: 'Environment & stack', state: 'current' },
  { id: '1', name: 'Auth — admin + staff', state: 'next' },
  { id: '2', name: 'Inventory + stock ledger', state: 'planned' },
  { id: '3', name: 'Packages & add-ons', state: 'planned' },
  { id: '4', name: 'Booking + usage + audit', state: 'planned' },
  { id: '5', name: 'Dashboard', state: 'planned' },
] as const;

function StateDot({ state }: { state: string }) {
  const color =
    state === 'current' ? 'bg-emerald-400' : state === 'next' ? 'bg-amber-400' : 'bg-zinc-600';
  return <span className={`size-1.5 rounded-full ${color}`} aria-hidden />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-6 py-20">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
          Phase 0 — foundation ready
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          BookingApp
        </h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Studio booking, inventory, and finance — a full Next.js + Neon stack, free tier end to
          end. The schema, auth wiring, and CI are in place; features land phase by phase.
        </p>
      </header>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <h2 id="stack-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Stack
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STACK.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-zinc-200 bg-white/40 p-4 dark:border-white/10 dark:bg-white/[0.02]"
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="roadmap-heading" className="flex flex-col gap-4">
        <h2 id="roadmap-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Roadmap
        </h2>
        <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-white/10 dark:border-white/10">
          {PHASES.map((phase) => (
            <li key={phase.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <StateDot state={phase.state} />
              <span className="font-mono text-xs text-zinc-400">{phase.id}</span>
              <span className="flex-1">{phase.name}</span>
              <span className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                {phase.state}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href="/api/health"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          Health check
        </a>
        <span className="text-zinc-500 dark:text-zinc-400">
          See{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-white/10">docs/</code>{' '}
          for the plan and roadmap.
        </span>
      </footer>
    </main>
  );
}
