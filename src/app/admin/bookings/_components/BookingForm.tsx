'use client';

import { useActionState, useId, useState } from 'react';
import type { ActionResult } from '../actions';

type Client = { id: string; name: string; phone: string | null; email: string | null };
type Package = { id: string; name: string; price: string; durationMin: number };
type Addon = { id: string; name: string; price: string };
type PaymentMode = { id: string; name: string };

type Props = {
  clients: Client[];
  packages: Package[];
  addonsMap: Record<string, Addon[]>; // packageId -> addons[]
  paymentModes: PaymentMode[];
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>;
};

const initialState: ActionResult<{ id: string }> | null = null;

// ── helpers ────────────────────────────────────────────────────────────

function formatPrice(p: string) {
  return `₱${parseFloat(p).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

function _toLocalISODateTimeValue(date: Date) {
  // Returns "YYYY-MM-DDTHH:MM" in local time for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function localDateTimeToUTCISO(localDT: string): string {
  // datetime-local gives "YYYY-MM-DDTHH:MM" without timezone
  // We treat it as local time → convert to UTC ISO string
  return new Date(localDT).toISOString();
}

// ── component ──────────────────────────────────────────────────────────

export default function BookingForm({ clients, packages, addonsMap, paymentModes, action }: Props) {
  const _id = useId();

  // Client
  const [createNewClient, setCreateNewClient] = useState(clients.length === 0);
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');

  // Package
  const [selectedPkgId, setSelectedPkgId] = useState(packages[0]?.id ?? '');
  const selectedPkg = packages.find((p) => p.id === selectedPkgId);
  const availableAddons = addonsMap[selectedPkgId] ?? [];

  // When package changes, clear selected addons (they're package-specific)
  const handlePackageChange = (newPkgId: string) => {
    setSelectedPkgId(newPkgId);
    setSelectedAddons({});
  };

  // DateTime — split into date and time for better UX
  const defaultStartDate = new Date();
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const defaultDateStr = `${defaultStartDate.getFullYear()}-${pad2(defaultStartDate.getMonth() + 1)}-${pad2(defaultStartDate.getDate())}`;
  const defaultTimeStr = `${pad2(defaultStartDate.getHours())}:${pad2(defaultStartDate.getMinutes())}`;

  const [startDate, setStartDate] = useState(defaultDateStr);
  const [startTime, setStartTime] = useState(defaultTimeStr);

  // Reconstruct startsAtLocal for compatibility
  const startsAtLocal = `${startDate}T${startTime}`;

  const endsAt = selectedPkg
    ? new Date(new Date(startsAtLocal).getTime() + selectedPkg.durationMin * 60_000)
    : null;

  // Add-ons — { addonId: qty }
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});

  // Inventory items — { itemId: qty }

  // Total preview
  const pkgPrice = selectedPkg ? parseFloat(selectedPkg.price) : 0;
  const addonsTotal = availableAddons.reduce((sum, a) => {
    const qty = selectedAddons[a.id] ?? 0;
    return qty > 0 ? sum + parseFloat(a.price) * qty : sum;
  }, 0);
  const grandTotal = pkgPrice + addonsTotal;

  // Build JSON for hidden fields before submit
  const addonsJson = JSON.stringify(
    Object.entries(selectedAddons)
      .filter(([, qty]) => qty > 0)
      .map(([addonId, qty]) => ({ addonId, qty })),
  );

  // Action state
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      // Inject UTC datetime + JSON blobs before the action runs
      formData.set('startsAt', localDateTimeToUTCISO(startsAtLocal));
      formData.set('addonsJson', addonsJson);
      formData.set('itemsJson', '[]'); // Auto-deducted from package
      return action(formData);
    },
    initialState,
  );

  // ── Toggle addon ───────────────────────────────────────────────────

  function toggleAddon(addonId: string, checked: boolean) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (checked) {
        next[addonId] = 1;
      } else {
        delete next[addonId];
      }
      return next;
    });
  }

  function setAddonQty(addonId: string, qty: number) {
    setSelectedAddons((prev) => ({ ...prev, [addonId]: Math.max(1, qty) }));
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <form action={formAction} className="space-y-8">
      {/* Error banner */}
      {state && !state.ok && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            state.conflict
              ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400'
              : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
          }`}
        >
          {state.error}
        </div>
      )}

      {/* ── Client ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Client</h2>

        {!createNewClient ? (
          <div className="space-y-3">
            <label className="block">
              <span className={labelCls}>Existing client</span>
              <select
                name="clientId"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={inputCls}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` — ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setCreateNewClient(true)}
              className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              + Create new client instead
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">New client</p>
            <Field label="Name *" name="clientName" required placeholder="Full name" />
            <Field label="Phone" name="clientPhone" placeholder="+63 …" />
            <Field label="Email" name="clientEmail" type="email" placeholder="client@example.com" />
            {clients.length > 0 && (
              <button
                type="button"
                onClick={() => setCreateNewClient(false)}
                className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                ← Pick existing client instead
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Package ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Package</h2>
        <label className="block">
          <span className={labelCls}>Package *</span>
          <select
            name="packageId"
            value={selectedPkgId}
            onChange={(e) => handlePackageChange(e.target.value)}
            className={inputCls}
            required
          >
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.price)} ({p.durationMin} min)
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* ── Date & Time ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Date & Time</h2>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Date *</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
              required
            />
          </label>

          <label className="block">
            <span className={labelCls}>Time *</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputCls}
              required
            />
          </label>
        </div>

        {endsAt && (
          <div className="rounded-lg border border-zinc-200 bg-blue-50 p-4 dark:border-zinc-700 dark:bg-blue-950/20">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Estimated End Time
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                {endsAt.toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {selectedPkg?.durationMin} min duration
              </span>
            </p>
          </div>
        )}
      </section>

      {/* ── Add-ons ───────────────────────────────────────────────── */}
      {availableAddons.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add-ons</h2>
          <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-700">
            {availableAddons.map((a) => {
              const checked = Boolean(selectedAddons[a.id]);
              const qty = selectedAddons[a.id] ?? 1;
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleAddon(a.id, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                    />
                    <div>
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">{a.name}</span>
                      <span className="ml-2 text-xs text-zinc-400">
                        {formatPrice(a.price)} each
                      </span>
                    </div>
                  </label>
                  <div className="flex items-center gap-3">
                    {checked ? (
                      <>
                        <input
                          type="number"
                          min={1}
                          value={qty}
                          onChange={(e) => setAddonQty(a.id, parseInt(e.target.value, 10) || 1)}
                          className="w-14 rounded-md border border-zinc-200 px-2 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <span className="w-20 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {formatPrice(String(parseFloat(a.price) * qty))}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-zinc-400">{formatPrice(a.price)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Payment ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Payment</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>Amount paid *</span>
            <input
              type="number"
              name="amountPaid"
              min={0}
              step="0.01"
              placeholder="0.00"
              className={inputCls}
              required
            />
          </label>
          <label className="block">
            <span className={labelCls}>Payment method *</span>
            <select name="paymentModeId" className={inputCls} required>
              <option value="" disabled>
                — select —
              </option>
              {paymentModes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── Notes ─────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any special requests or internal notes…"
          className={`${inputCls} resize-y`}
        />
      </section>

      {/* ── Total + Submit ─────────────────────────────────────────── */}
      <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
        {/* Line-item breakdown */}
        <div className="mb-4 space-y-1 rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
          <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <span>{selectedPkg?.name ?? 'Package'}</span>
            <span>{formatPrice(selectedPkg?.price ?? '0')}</span>
          </div>
          {availableAddons
            .filter((a) => (selectedAddons[a.id] ?? 0) > 0)
            .map((a) => {
              const qty = selectedAddons[a.id] ?? 1;
              return (
                <div
                  key={a.id}
                  className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span>
                    {a.name}
                    {qty > 1 && <span className="ml-1 text-xs text-zinc-400">× {qty}</span>}
                  </span>
                  <span>{formatPrice(String(parseFloat(a.price) * qty))}</span>
                </div>
              );
            })}
          <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || packages.length === 0}
          className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? 'Saving…' : 'Create booking'}
        </button>
      </div>
    </form>
  );
}

// ── Shared classes ─────────────────────────────────────────────────────

const labelCls = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
const inputCls =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

// ── Field helper ───────────────────────────────────────────────────────

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };

function Field({ label, name, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input name={name} className={inputCls} {...props} />
    </label>
  );
}
