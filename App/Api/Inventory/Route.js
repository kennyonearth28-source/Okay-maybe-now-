const DUTCHIE_URL = 'https://dutchie.com/dispensary/ethos-northeast-philadelphia/products/flower';

// Utility: find the <script id="__NEXT_DATA__"> JSON in Next.js pages
function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// Utility: walk an object and return the first array that looks like products
function findProducts(node) {
  const looksLikeProduct = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    // common Dutchie-ish fields seen on product objects
    const keys = Object.keys(obj);
    const hit =
      keys.includes('name') ||
      keys.includes('brand') ||
      keys.includes('brandName') ||
      keys.includes('strainType') ||
      keys.includes('category') ||
      keys.includes('productType');
    return hit;
  };

  if (Array.isArray(node)) {
    // If this array itself looks like products, return it
    if (node.length && node.every(x => typeof x === 'object' && looksLikeProduct(x))) {
      return node;
    }
    // Otherwise, search children
    for (const v of node) {
      const found = findProducts(v);
      if (found) return found;
    }
  } else if (node && typeof node === 'object') {
    // Prefer obvious "products" keys
    for (const [k, v] of Object.entries(node)) {
      if (/products?|hits|items/i.test(k) && Array.isArray(v)) {
        const ok = v.some(x => typeof x === 'object' && looksLikeProduct(x));
        if (ok) return v;
      }
    }
    // Fallback: deep search
    for (const v of Object.values(node)) {
      const found = findProducts(v);
      if (found) return found;
    }
  }
  return null;
}

// Normalize a product to the fields you want (no prices)
function normalize(p) {
  const brand =
    p?.brand?.name ?? p?.brandName ?? p?.producer?.name ?? null;

  // strain type / category
  const strainType =
    p?.strainType ?? p?.type ?? p?.category ?? p?.productType ?? null;

  // size/variant-ish
  const size =
    p?.size ??
    p?.variantName ??
    p?.option ??
    p?.weight ??
    p?.unitOfMeasure ??
    null;

  // potency fields are messy; keep best-effort (strings or numbers)
  const thc =
    p?.thc ??
    p?.potency?.thc?.formatted ??
    p?.potency?.thc?.range ??
    p?.thcContent ??
    null;

  const cbd =
    p?.cbd ??
    p?.potency?.cbd?.formatted ??
    p?.potency?.cbd?.range ??
    p?.cbdContent ??
    null;

  // TAC (total active cannabinoids) best-effort
  const tac =
    p?.tac ??
    p?.totalActiveCannabinoids ??
    p?.potency?.tac ??
    null;

  return {
    name: p?.name ?? p?.title ?? p?.productName ?? null,
    brand,
    strainType,
    size,
    tac,
    thc,
    cbd,
    // keep a non-identifying id if present (not a URL from the store)
    slug: p?.slug ?? p?.handle ?? p?.id ?? null
  };
}

// Deduplicate by name + size + brand
function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = [item.name, item.size, item.brand].map(x => (x ?? '').toString().toLowerCase().trim()).join('||');
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export async function GET() {
  try {
    const html = await fetch(DUTCHIE_URL, {
      cache: 'no-store',
      headers: {
        // Pretend to be a regular mobile Safari to reduce chance of blocks
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
        'accept-language': 'en-US,en;q=0.9'
      }
    }).then(r => {
      if (!r.ok) throw new Error(`Upstream status ${r.status}`);
      return r.text();
    });

    const nextData = extractNextData(html);
    if (!nextData) {
      return Response.json(
        { error: 'Could not locate embedded data on Dutchie page.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // The product list is buried inside nextData.props.pageProps.* somewhere
    const root = nextData?.props ?? nextData;
    const productsRaw = findProducts(root);

    if (!productsRaw || !Array.isArray(productsRaw) || productsRaw.length === 0) {
      return Response.json(
        {
          error: 'No products found in embedded data.',
          hint: 'Page structure may have changed.'
        },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const cleaned = dedupe(productsRaw.map(normalize))
      // keep only items with a name
      .filter(x => x.name);

    return Response.json(
      {
        source: 'dutchie:ethos-northeast-philadelphia/flower',
        lastUpdated: new Date().toISOString(),
        count: cleaned.length,
        inventory: cleaned
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return Response.json(
      { error: 'Fetch failed', details: String(err) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
