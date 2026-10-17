'use client';
import { useState } from 'react';
import { RequireRole, useAuth } from '../../src/lib/auth';
import { CadetTable } from '../../src/components/CadetTable';
import { BulkUploadCard } from '../../src/components/BulkUploadCard';
import { STAFF_ROLES, isOfficer } from '../../src/types';

export default function CadetsPage() {
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <RequireRole roles={[...STAFF_ROLES]}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Cadet database</h1>
        <p className="text-sm opacity-70">
          Filter by year, department, rank, certificate or platoon, choose the columns, then download Excel, CSV or PDF.
          {isOfficer(user?.role) ? ' Officers can also import a whole batch from the enrolment template.' : ' Exports are limited to your platoon.'}
        </p>
        <CadetTable reloadKey={reloadKey} />
        {isOfficer(user?.role) && <BulkUploadCard onImported={() => setReloadKey((key) => key + 1)} />}
      </div>
    </RequireRole>
  );
}
