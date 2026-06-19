'use client';

import { useRef, useState } from 'react';

type Props = {
  current?: string | null;
  name?: string;
};

export default function PhotoUpload({ current, name = 'photo' }: Props) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      if (hiddenRef.current) hiddenRef.current.value = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-4">
      {/* Hidden field that holds the base64 value */}
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={current ?? ''} />

      {/* Avatar preview */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 transition-colors hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Photo" className="h-full w-full object-cover" />
        ) : (
          <svg
            className="h-8 w-8 text-zinc-300 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs font-medium text-white">Change</span>
        </div>
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              if (hiddenRef.current) hiddenRef.current.value = '';
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="ml-3 text-sm text-red-400 hover:text-red-600 dark:hover:text-red-300"
          >
            Remove
          </button>
        )}
        <p className="mt-1 text-xs text-zinc-400">PNG, JPG. Max ~500KB recommended.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
