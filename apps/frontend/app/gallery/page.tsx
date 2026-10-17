export default function Gallery() {
  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Gallery</h1>
      <p className="mt-2 text-sm">Photos/videos by event. Uploads require photo consent (DPDP) — public display only with explicit consent flag.</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs opacity-60">
        {['RDC selection', 'CATC camp', 'Blood donation', 'Tree plantation', 'Swachh Bharat', 'Firing practice'].map((e) => (
          <div key={e} className="rounded border p-6">{e}</div>
        ))}
      </div>
    </div>
  );
}
