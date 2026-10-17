'use client';
import { useRef, useState } from 'react';
import type { BulkUploadResult } from '../types';
import { api, apiDownload } from '../lib/api';

/**
 * Officer-only bulk enrolment: download the template, fill it in, upload it.
 *
 * The API reads only the columns on the template — extra headers in the sheet are ignored — and
 * reports per-row problems instead of failing the whole import.
 */
export function BulkUploadCard({ onImported }: { onImported: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setResult(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const data = await api<BulkUploadResult>('/cadets/bulk-upload', { method: 'POST', body });
      setResult(data);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="card space-y-2">
      <h2 className="font-bold">Bulk enrolment</h2>
      <p className="text-sm opacity-80">
        Download the template, add one cadet per row, then upload the .xlsx back. Rows are matched on register number, so
        re-uploading the same sheet updates instead of duplicating.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => void apiDownload('/cadets/template', 'cadet-template.xlsx')}>
          Download template
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {busy && <span className="text-sm">Uploading…</span>}
      </div>

      {error && (
        <p className="text-sm text-nccred" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="text-sm">
          <p>
            {result.inserted} row(s) written, {result.skipped} blank row(s) skipped.
          </p>
          {result.errors.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">{result.errors.length} row(s) need attention</summary>
              <ul className="mt-1 list-inside list-disc">
                {result.errors.slice(0, 20).map((row) => (
                  <li key={row.row}>
                    Row {row.row}: {row.message}
                  </li>
                ))}
              </ul>
              {result.errors.length > 20 && <p className="opacity-70">…and {result.errors.length - 20} more.</p>}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
