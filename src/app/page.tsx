const STACK = [
  { label: 'Next.js 15', note: 'App Router · RSC-first' },
  { label: 'Neon Postgres', note: 'serverless · free tier' },
  { label: 'Drizzle ORM', note: 'typed schema + migrations' },
  { label: 'Auth.js v5', note: 'admin / staff roles' },
  { label: 'Tailwind 4', note: 'dark-first · WCAG 2.2 AA' },
  { label: 'Biome', note: 'lint + format' },
];

const PHASES = [
  { id: '0', name: 'Environment & stack', state: 'done' },
  { id: '1', name: 'Auth — admin + staff', state: 'done' },
  { id: '2', name: 'Inventory + stock ledger', state: 'done' },
  { id: '3', name: 'Packages & add-ons', state: 'done' },
  { id: '4', name: 'Booking + usage + audit', state: 'done' },
  { id: '5', name: 'Dashboard', state: 'done' },
  { id: '6', name: 'Payments — dynamic methods', state: 'done' },
  { id: '7', name: 'Expenses + auto-restock', state: 'done' },
  { id: 'CF', name: 'Cash flow module', state: 'done' },
  { id: '…', name: 'Client login', state: 'later' },
] as const;

function StateDot({ state }: { state: string }) {
  const color =
    state === 'done' ? 'bg-emerald-400' : state === 'later' ? 'bg-zinc-400' : 'bg-zinc-600';
  return <span className={`size-1.5 rounded-full ${color}`} aria-hidden />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-12 px-6 py-20">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
          All phases complete
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          BookingApp
        </h1>
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Studio booking, inventory, and finance — full Next.js + Neon, free tier end to end.
          Bookings, packages, add-ons, inventory, payments, expenses, and cash flow are all live.
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
        <a
          href="/admin"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
        >
          Admin →
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
