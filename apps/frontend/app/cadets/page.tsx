'use client';
import { RequireRole } from '../../src/lib/auth';
import { CadetTable } from '../../src/components/CadetTable';

export default function CadetsPage() {
  return (
    <RequireRole roles={['SUPER_ADMIN', 'OFFICER_ANO_CTO', 'LEADER_SUO']}>
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Cadet database</h1>
        <p className="text-sm opacity-70">Filter by year/department/rank/certificate/camp · choose columns · Excel/CSV/PDF. Bulk enrolment via template in backend (<code>GET /cadets/template</code>).</p>
        <CadetTable />
      </div>
    </RequireRole>
  );
}
