'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import PhotoUpload from '../_components/PhotoUpload';
import { createEmployee } from '../actions';

export default function NewEmployeePage() {
  const [state, action, pending] = useActionState(createEmployee, null);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/employees"
          className="text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          ← Employees
        </Link>
        <span className="text-zinc-200 dark:text-zinc-700">/</span>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">New employee</span>
      </div>

      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Add employee</h1>

      <form action={action} className="space-y-5">
        {/* Photo */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Photo
          </label>
          <PhotoUpload />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              First name <span className="text-red-400">*</span>
            </label>
            <input
              name="firstName"
              required
              placeholder="Juan"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Last name <span className="text-red-400">*</span>
            </label>
            <input
              name="lastName"
              required
              placeholder="Dela Cruz"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
            />
          </div>
        </div>

        {/* Credentials */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="juan@studio.com"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Username <span className="text-red-400">*</span>
          </label>
          <input
            name="username"
            required
            minLength={6}
            maxLength={30}
            placeholder="e.g. juan_dc"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
          <p className="mt-1 text-xs text-zinc-400">Min. 6 characters. Lowercase letters, numbers, underscores only.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Password <span className="text-red-400">*</span>
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Job info */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Position
          </label>
          <input
            name="position"
            placeholder="e.g. Photographer, Editor"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Details
          </label>
          <textarea
            name="details"
            rows={3}
            placeholder="Bio, skills, emergency contact, etc."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Hire Date
          </label>
          <input
            name="hireDate"
            type="date"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800" />

        {/* Salary — admin only, always visible here since this is an admin-only page */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Salary (admin only)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Amount (₱)
              </label>
              <input
                name="salary"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Type
              </label>
              <select
                name="salaryType"
                defaultValue="monthly"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
              >
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Admin notes (internal)
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Private notes visible only to admins"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-400"
          />
        </div>

        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 py-2.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? 'Creating…' : 'Create employee'}
        </button>
      </form>
    </div>
  );
}
