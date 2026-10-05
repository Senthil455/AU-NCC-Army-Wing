'use client';
import { useEffect, useState } from 'react';
import { api, API_BASE } from '../lib/api';
import type { Cadet } from '../types';

const ALL_COLUMNS = ['name', 'regdNo', 'rank', 'department', 'year', 'platoon', 'certificate', 'bloodGroup', 'phone', 'attendancePct'];

export function CadetTable() {
  const [rows, setRows] = useState<Cadet[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', department: '', year: '', certificate: '', platoon: '' });
  const [columns, setColumns] = useState<string[]>(['name', 'regdNo', 'department', 'year', 'certificate', 'attendancePct']);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const q = new URLSearchParams({ ...filters, page: '1', pageSize: '50' });
      const d = await api<{ data: Cadet[]; total: number }>(`/cadets?${q.toString()}`);
      setRows(d.data);
      setTotal(d.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (fmt: 'export.xlsx' | 'export.csv' | 'export.pdf') => {
    const q = new URLSearchParams({ ...filters, columns: columns.join(',') });
    const token = localStorage.getItem('ncc_access');
    const res = await fetch(`${API_BASE}/cadets/${fmt}?${q.toString()}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      setError('Export failed (officer/leader role required)');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cadets.${fmt.split('.')[1]}`;
    a.click();
  };

  return (
    <div className="card">
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {(['search', 'department', 'year', 'certificate', 'platoon'] as const).map((k) => (
          <input key={k} className="input" placeholder={k} value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} />
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="btn" onClick={load}>Search</button>
        <button className="btn-secondary" onClick={() => download('export.xlsx')}>Excel</button>
        <button className="btn-secondary" onClick={() => download('export.csv')}>CSV</button>
        <button className="btn-secondary" onClick={() => download('export.pdf')}>PDF</button>
        <span className="ml-auto text-sm opacity-70">{total} cadets</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="font-semibold">Columns:</span>
        {ALL_COLUMNS.map((c) => (
          <label key={c} className="flex items-center gap-1">
            <input type="checkbox" checked={columns.includes(c)} onChange={() => setColumns(columns.includes(c) ? columns.filter((x) => x !== c) : [...columns, c])} />
            {c}
          </label>
        ))}
      </div>
      {error && <p className="mb-2 text-sm text-nccred">{error}</p>}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c}>
                    {c === 'attendancePct' && typeof r[c as keyof Cadet] === 'number' && (r[c as keyof Cadet] as number) < 75 ? (
                      <span className="font-bold text-nccred">{String(r[c as keyof Cadet])}% ⚠</span>
                    ) : (
                      String(r[c as keyof Cadet] ?? '-')
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
