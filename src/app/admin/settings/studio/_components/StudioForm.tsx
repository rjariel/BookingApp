'use client';

import { useActionState, useRef, useState } from 'react';
import { type StudioFormState, saveStudioProfile } from '../actions';

type Props = {
  studioName: string;
  logoUrl: string | null;
};

export function StudioForm({ studioName, logoUrl }: Props) {
  const [state, action, pending] = useActionState<StudioFormState | undefined, FormData>(
    saveStudioProfile,
    undefined,
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [logoData, setLogoData] = useState<string>('');
  const [removeLogo, setRemoveLogo] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500_000) {
      alert('Logo must be under 500 KB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      setLogoData(result);
      setRemoveLogo(false);
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    setPreview(null);
    setLogoData('');
    setRemoveLogo(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <form action={action} className="space-y-6">
      {/* Hidden fields */}
      <input type="hidden" name="logoUrl" value={logoData} />
      <input type="hidden" name="removeLogo" value={String(removeLogo)} />

      {/* Studio name */}
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Studio name</span>
          <input
            name="studioName"
            type="text"
            defaultValue={studioName}
            required
            maxLength={100}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </label>
        {state?.fieldErrors?.studioName && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {state.fieldErrors.studioName[0]}
          </p>
        )}
      </div>

      {/* Logo */}
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700 space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Studio logo</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            PNG, JPG, SVG · max 500 KB · recommended 256×256 px or larger
          </p>
        </div>

        {/* Preview */}
        {preview ? (
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Logo preview"
                className="max-h-full max-w-full rounded object-contain"
              />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-500 underline-offset-2 hover:underline dark:text-red-400"
            >
              Remove logo
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800">
            <span className="text-xs text-zinc-400">No logo</span>
          </div>
        )}

        {/* File picker */}
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            {preview ? 'Replace logo' : 'Upload logo'}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFile}
              className="sr-only"
            />
          </label>
        </div>

        {state?.fieldErrors?.logoUrl && (
          <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.logoUrl[0]}</p>
        )}
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        {state?.ok && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
