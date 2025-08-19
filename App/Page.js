'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState({ inventory: [], count: 0, lastUpdated: null });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setErr(e?.message || 'Error');
        setLoading(false);
      });
  }, []);

  return (
    <main>
      <h1>Flower Inventory (no prices)</h1>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: 'crimson' }}>Error: {err}</p>}

      <div className="list">
        {(data.inventory || []).map((p, i) => (
          <div className="item" key={p.slug || `${p.name}-${i}`}>
            <div className="name">{p.name}</div>
            <div className="meta">
              {[p.brand, p.strainType, p.size]
                .filter(Boolean)
                .join(' · ')}
            </div>
            { (p.tac || p.thc || p.cbd) && (
              <div className="meta">
                {p.tac ? `TAC: ${p.tac}` : ''} {p.tac && (p.thc || p.cbd) ? ' · ' : ''}
                {p.thc ? `THC: ${p.thc}` : ''} {p.thc && p.cbd ? ' · ' : ''}
                {p.cbd ? `CBD: ${p.cbd}` : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      <p><small>
        Items refresh on every page load. No pricing or retailer branding is shown.
        {data.lastUpdated ? ` · Last updated: ${new Date(data.lastUpdated).toLocaleString()}` : ''}
      </small></p>
    </main>
  );
}
