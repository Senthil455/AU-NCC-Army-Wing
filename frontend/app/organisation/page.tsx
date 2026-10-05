const leaders = [
  { role: 'Associate NCC Officer (ANO)', name: '—', note: 'Full admin, approvals, reports' },
  { role: 'Caretaker / CTO', name: '—', note: 'Training + records' },
  { role: 'Senior Under Officer', name: '—', note: 'Platoon attendance + duties' },
  { role: 'Sergeants / Corporals', name: 'Juniors & Seniors', note: 'Role-based switching (distinct IDs)' },
];

export default function Organisation() {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Organisation</h1>
      <ul className="mt-3 space-y-2">
        {leaders.map((l) => (
          <li key={l.role} className="rounded border p-3 text-sm">
            <p className="font-semibold">{l.role} — {l.name}</p>
            <p className="opacity-70">{l.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
