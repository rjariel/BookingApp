'use client';

import { useActionState, useTransition } from 'react';
import PhotoUpload from '../_components/PhotoUpload';
import { changeEmployeePassword, toggleEmployeeActive, updateEmployee } from '../actions';

type Employee = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
  position: string | null;
  details: string | null;
  salary: string | null;
  salaryType: 'monthly' | 'daily' | 'hourly' | null;
  hireDate: string | null;
  notes: string | null;
};

type Props = { employee: Employee };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400';

export default function EditForm({ employee }: Props) {
  const [profileState, profileAction, profilePending] = useActionState(updateEmployee, null);
  const [pwState, pwAction, pwPending] = useActionState(changeEmployeePassword, null);
  const [activePending, startActive] = useTransition();

  return (
    <div className="space-y-8">
      {/* ── Profile form ── */}
      <form action={profileAction} className="space-y-5">
        <input type="hidden" name="userId" value={employee.id} />

        {/* Photo */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Photo
          </label>
          <PhotoUpload current={employee.photo} />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name *">
            <input
              name="firstName"
              required
              defaultValue={employee.firstName ?? ''}
              placeholder="Juan"
              className={inputCls}
            />
          </Field>
          <Field label="Last name *">
            <input
              name="lastName"
              required
              defaultValue={employee.lastName ?? ''}
              placeholder="Dela Cruz"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Email — display only, can't change here */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {employee.email}
          </p>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Job info */}
        <Field label="Position">
          <input
            name="position"
            defaultValue={employee.position ?? ''}
            placeholder="e.g. Photographer"
            className={inputCls}
          />
        </Field>

        <Field label="Details">
          <textarea
            name="details"
            rows={3}
            defaultValue={employee.details ?? ''}
            placeholder="Bio, skills, emergency contact…"
            className={inputCls}
          />
        </Field>

        <Field label="Hire Date">
          <input
            name="hireDate"
            type="date"
            defaultValue={employee.hireDate ?? ''}
            className={inputCls}
          />
        </Field>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Salary — admin-only section */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Salary (admin only)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₱)">
              <input
                name="salary"
                type="number"
                step="0.01"
                min="0"
                defaultValue={employee.salary ?? ''}
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Type">
              <select
                name="salaryType"
                defaultValue={employee.salaryType ?? 'monthly'}
                className={inputCls}
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </Field>
          </div>
        </div>

        <Field label="Admin notes (internal)">
          <textarea
            name="notes"
            rows={2}
            defaultValue={employee.notes ?? ''}
            placeholder="Private notes visible only to admins"
            className={inputCls}
          />
        </Field>

        {profileState?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {profileState.error}
          </p>
        )}
        {profileState?.success && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
        )}

        <button
          type="submit"
          disabled={profilePending}
          className="w-full rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {profilePending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* ── Change password ── */}
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Change password
        </h2>
        <form action={pwAction} className="space-y-3">
          <input type="hidden" name="userId" value={employee.id} />
          <Field label="New password">
            <input
              name="password"
              type="password"
              minLength={8}
              placeholder="Min. 8 characters"
              className={inputCls}
            />
          </Field>
          <Field label="Confirm password">
            <input
              name="confirmPassword"
              type="password"
              placeholder="Repeat password"
              className={inputCls}
            />
          </Field>
          {pwState?.error && <p className="text-sm text-red-500">{pwState.error}</p>}
          {pwState?.success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Password updated.</p>
          )}
          <button
            type="submit"
            disabled={pwPending}
            className="w-full rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {pwPending ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {/* ── Deactivate / reactivate ── */}
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {employee.active ? 'Deactivate' : 'Reactivate'} account
        </h2>
        <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          {employee.active
            ? 'Deactivated employees cannot log in.'
            : 'Reactivating allows this employee to log in again.'}
        </p>
        <button
          disabled={activePending}
          onClick={() => startActive(() => toggleEmployeeActive(employee.id, !employee.active))}
          className={`w-full rounded-md py-2 text-sm font-medium disabled:opacity-50 ${
            employee.active
              ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950'
              : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950'
          }`}
        >
          {activePending ? '…' : employee.active ? 'Deactivate employee' : 'Reactivate employee'}
        </button>
      </div>
    </div>
  );
}
