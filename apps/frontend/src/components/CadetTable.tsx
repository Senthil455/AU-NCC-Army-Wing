'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Cadet, ExportableColumn, ExportFormat, Paginated, SortDirection, SortableCadetField } from '../types';
import { EXPORTABLE_COLUMNS, SENSITIVE_COLUMNS, SORTABLE_CADET_FIELDS, isLowAttendance, isOfficer } from '../types';
import { api, apiDownload } from '../lib/api';
import { useAuth } from '../lib/auth';

const PAGE_SIZE = 50;
const CERTIFICATES = ['', 'NONE', 'A', 'B', 'C'] as const;

const DEFAULT_COLUMNS: ExportableColumn[] = ['name', 'regdNo', 'department', 'year', 'certificate', 'attendancePct'];

const today = () => new Date().toISOString().slice(0, 10);

function formatCell(column: ExportableColumn, value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (column === 'attendancePct') {
    const pct = Number(value);
    return isLowAttendance(pct) ? (
      <span className="font-bold text-nccred">{pct}% ⚠</span>
    ) : (
      `${pct}%`
    );
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function CadetTable({ reloadKey = 0 }: { reloadKey?: number }) {
  const { user } = useAuth();
  const officer = isOfficer(user?.role);

  const [rows, setRows] = useState<Cadet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', department: '', year: '', certificate: '', platoon: '' });
  const [sort, setSort] = useState<SortableCadetField>('name');
  const [order, setOrder] = useState<SortDirection>('asc');
  const [columns, setColumns] = useState<ExportableColumn[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Sensitive columns stay hidden from leaders — the API rejects them anyway (see docs/api.md).
  const selectableColumns = useMemo(
    () => EXPORTABLE_COLUMNS.filter((column) => officer || !SENSITIVE_COLUMNS.includes(column)),
    [officer],
  );

  const query = useCallback(
    (extra: Record<string, string> = {}) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort, order, ...extra });
      for (const [key, value] of Object.entries(filters)) {
        if (value.trim()) params.set(key, value.trim());
      }
      return params.toString();
    },
    [filters, order, page, sort],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<Paginated<Cadet>>(`/cadets?${query()}`);
      setRows(data.data);
      setTotal(data.total);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load cadets');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
    // `reloadKey` lets the bulk-upload card ask for a fresh page after an import.
  }, [load, reloadKey]);

  const download = async (format: ExportFormat) => {
    setError('');
    setNotice('');
    if (!columns.length) {
      setError('Pick at least one column to export.');
      return;
    }
    try {
      const info = await apiDownload(
        `/cadets/export.${format}?${query({ columns: columns.join(',') })}`,
        `cadets-${today()}.${format}`,
      );
      setNotice(
        info.truncated
          ? `Downloaded the first ${info.rows} rows — the export cap was reached, narrow the filters for a full list.`
          : `Downloaded ${info.rows ?? ''} row(s) for the current filters.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const toggleSort = (column: ExportableColumn) => {
    if (!SORTABLE_CADET_FIELDS.includes(column as SortableCadetField)) return;
    const field = column as SortableCadetField;
    setPage(1);
    if (field === sort) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setSort(field);
      setOrder('asc');
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="card">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <label className="text-xs">
          Search
          <input
            className="input mt-1"
            placeholder="name, regd no, NCC no"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <label className="text-xs">
          Department
          <input className="input mt-1" value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} />
        </label>
        <label className="text-xs">
          Year
          <input className="input mt-1" inputMode="numeric" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} />
        </label>
        <label className="text-xs">
          Certificate
          <select className="input mt-1" value={filters.certificate} onChange={(e) => setFilters({ ...filters, certificate: e.target.value })}>
            {CERTIFICATES.map((c) => (
              <option key={c || 'any'} value={c}>
                {c || 'Any'}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Platoon
          <input className="input mt-1" value={filters.platoon} onChange={(e) => setFilters({ ...filters, platoon: e.target.value })} />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          className="btn"
          onClick={() => {
            setPage(1);
            void load();
          }}
        >
          Search
        </button>
        <button className="btn-secondary" onClick={() => void download('xlsx')}>
          Excel
        </button>
        <button className="btn-secondary" onClick={() => void download('csv')}>
          CSV
        </button>
        <button className="btn-secondary" onClick={() => void download('pdf')}>
          PDF
        </button>
        <span className="ml-auto text-sm opacity-70" aria-live="polite">
          {total} cadet(s)
        </span>
      </div>

      <fieldset className="mb-3 flex flex-wrap gap-3 text-xs">
        <legend className="font-semibold">Columns</legend>
        {selectableColumns.map((column) => (
          <label key={column} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={columns.includes(column)}
              onChange={() =>
                setColumns(columns.includes(column) ? columns.filter((c) => c !== column) : [...columns, column])
              }
            />
            {column}
            {SENSITIVE_COLUMNS.includes(column) && <span className="opacity-60">(officer only)</span>}
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="mb-2 text-sm text-nccred" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="mb-2 text-sm text-olive-800">{notice}</p>}

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = SORTABLE_CADET_FIELDS.includes(column as SortableCadetField);
                return (
                  <th key={column}>
                    {sortable ? (
                      <button className="flex items-center gap-1 font-semibold" onClick={() => toggleSort(column)}>
                        {column}
                        {sort === column && <span aria-hidden>{order === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    ) : (
                      column
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column}>{formatCell(column, row[column as keyof Cadet])}</td>
                ))}
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-sm opacity-70">
                  No cadet matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          ← Prev
        </button>
        <span>
          Page {page} of {pages}
        </span>
        <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Next →
        </button>
        {loading && <span className="opacity-70">Loading…</span>}
      </div>
    </div>
  );
}
