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
  return <span className={`size-1.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export default function RoadmapPage() {
  const done = PHASES.filter((p) => p.state === 'done').length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden />
            {done}/{PHASES.length} complete
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Build phases for BookingApp — Next.js + Neon, free tier.
        </p>
      </div>

      <ol className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 dark:divide-white/10 dark:border-white/10">
        {PHASES.map((phase) => (
          <li key={phase.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <StateDot state={phase.state} />
            <span className="w-6 shrink-0 font-mono text-xs text-zinc-400">{phase.id}</span>
            <span className="flex-1 text-zinc-800 dark:text-zinc-200">{phase.name}</span>
            <span className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
              {phase.state}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
