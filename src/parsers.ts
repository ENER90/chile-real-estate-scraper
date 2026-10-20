export interface Listing {
  source: 'portalinmobiliario' | 'toctoc';
  id: string; url: string | null; title: string | null; operation: string; propertyType: string;
  isNewProject: boolean;
  price: number | null; currency: 'UF' | 'CLP' | null; priceUF: number | null; priceCLP: number | null; pricePrefix: string | null;
  m2Util: number | null; m2Total: number | null; m2UtilMax: number | null;
  bedrooms: number | null; bedroomsMax: number | null; bathrooms: number | null; bathroomsMax: number | null; parking: number | null;
  comuna: string | null; region: string | null; address: string | null; lat: number | null; lon: number | null;
  publisher: string | null; publisherType: 'corredora' | 'inmobiliaria' | 'particular' | null;
  publishedAt: string | null; publishedText: string | null;
  images: string[]; pricePerM2UF: number | null; pricePerM2CLP: number | null; scrapedAt: string;
}

export const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (s: unknown): number | null => {
  if (s === null || s === undefined || s === '') return null;
  if (typeof s === 'number') return Number.isFinite(s) ? s : null;
  const m = String(s).replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const range = (txt: string | undefined): [number | null, number | null] => {
  if (!txt) return [null, null];
  const ns = [...txt.replace(/\.(?=\d{3}\b)/g, '').matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
  return [ns[0] ?? null, ns.length > 1 ? ns[ns.length - 1] : null];
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Fills priceUF/priceCLP and price per m2 using the UF value. */
export function finalize(l: Listing, uf: number): Listing {
  if (l.price !== null) {
    if (l.currency === 'UF') { l.priceUF ??= l.price; l.priceCLP ??= Math.round(l.price * uf); }
    if (l.currency === 'CLP') { l.priceCLP ??= l.price; l.priceUF ??= r2(l.price / uf); }
  }
  const m2 = l.m2Util ?? l.m2Total;
  // per-m2 only for single units (project price ranges would be misleading)
  if (m2 && m2 > 0 && l.m2UtilMax === null) {
    l.pricePerM2UF = l.priceUF !== null ? r2(l.priceUF / m2) : null;
    l.pricePerM2CLP = l.priceCLP !== null ? Math.round(l.priceCLP / m2) : null;
  }
  return l;
}

function balanced(s: string, i: number): string | null {
  let d = 0, q = false, e = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (e) e = false; else if (c === '\\') e = true; else if (c === '"') q = false; }
    else if (c === '"') q = true; else if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return s.slice(i, j + 1); }
  }
  return null;
}

const blank = (src: Listing['source'], op: string, type: string, now: string): Listing => ({
  source: src, id: '', url: null, title: null, operation: op, propertyType: type, isNewProject: false,
  price: null, currency: null, priceUF: null, priceCLP: null, pricePrefix: null,
  m2Util: null, m2Total: null, m2UtilMax: null, bedrooms: null, bedroomsMax: null, bathrooms: null, bathroomsMax: null, parking: null,
  comuna: null, region: null, address: null, lat: null, lon: null, publisher: null, publisherType: null,
  publishedAt: null, publishedText: null, images: [], pricePerM2UF: null, pricePerM2CLP: null, scrapedAt: now,
});

// ---------------- Portal Inmobiliario ----------------
export function piSearchUrl(op: string, type: string, comuna: string, region: string, offset: number, price?: { min?: number; max?: number; cur: 'UF' | 'CLP' }) {
  const parts: string[] = [];
  if (offset > 0) parts.push(`_Desde_${offset + 1}`);
  if (price && (price.min || price.max)) { const c = price.cur === 'UF' ? 'CLF' : 'CLP'; parts.push(`_PriceRange_${price.min ?? 0}${c}-${price.max ?? 0}${c}`); }
  if (parts.length) parts.push('_NoIndex_True');
  return `https://www.portalinmobiliario.com/${op}/${type}/${slug(comuna)}-${slug(region)}${parts.length ? '/' + parts.join('') : ''}`;
}

export function parsePiSearch(html: string, op: string, type: string, now: string): { listings: Listing[]; total: number | null } {
  const seen = new Map<string, Listing>();
  let pos = 0;
  for (;;) {
    const i = html.indexOf('"polycard":{', pos); if (i < 0) break; pos = i + 11;
    const raw = balanced(html, i + 11); if (!raw) continue;
    let c: any; try { c = JSON.parse(raw); } catch { continue; }
    const id = c.metadata?.id; if (!id || seen.has(id)) continue;
    const comp: Record<string, any> = {}; for (const x of c.components ?? []) comp[x.type] = x[x.type];
    const l = blank('portalinmobiliario', op, type, now);
    l.id = id;
    const u: string = c.metadata?.url ?? '';
    const m = id.match(/^MLC(\d+)$/);
    l.url = u && !u.includes('click1.') ? `https://${u.replace(/^https?:\/\//, '').replace(/^portalinmobiliario/, 'www.portalinmobiliario')}` : (m ? `https://www.portalinmobiliario.com/MLC-${m[1]}` : null);
    l.title = comp.title?.text ?? null;
    l.isNewProject = !!comp.pill?.text?.includes('PROYECTO') || /DEVELOPMENT/.test(c.metadata?.domain_id ?? '');
    const cp = comp.price?.current_price;
    if (cp) { l.price = cp.value ?? null; l.currency = cp.currency === 'CLF' ? 'UF' : cp.currency === 'CLP' ? 'CLP' : null; l.pricePrefix = comp.price?.prefix?.text ?? null; }
    for (const t of comp.attributes_list?.texts ?? [] as string[]) {
      const [a, b] = range(t);
      if (/dormitorio/i.test(t)) { l.bedrooms = a; l.bedroomsMax = b; }
      else if (/baño/i.test(t)) { l.bathrooms = a; l.bathroomsMax = b; }
      else if (/m² útiles/i.test(t)) { l.m2Util = a; l.m2UtilMax = b; }
      else if (/m² totales/i.test(t)) { l.m2Total = a; }
    }
    const loc: string | undefined = comp.location?.text;
    if (loc) { l.address = loc; const p = loc.split(',').map((s) => s.trim()); l.comuna = p[p.length - 1] || null; }
    const seller: string | undefined = comp.seller?.text?.replace(/\{[^}]+\}/g, '').trim() || c.seller_logo?.alt_text;
    l.publisher = seller || null;
    l.publisherType = l.isNewProject ? 'inmobiliaria' : seller ? 'corredora' : null; // refined from the detail page
    l.images = (c.pictures?.pictures ?? []).map((p: any) => `https://http2.mlstatic.com/D_NQ_NP_${p.id}-O.webp`);
    seen.set(id, l);
  }
  const t = html.match(/"total":(\d+),"category_id"/);
  return { listings: [...seen.values()], total: t ? Number(t[1]) : null };
}

const RELATIVE: [RegExp, number][] = [[/hoy/i, 0], [/ayer/i, 1], [/esta semana/i, 7], [/hace (\d+) d[ií]as?/i, -1], [/hace (\d+) semanas?/i, -7], [/hace (\d+) mes(es)?/i, -30], [/hace m[aá]s de un a[nñ]o/i, 365], [/hace (\d+) a[nñ]os?/i, -365]];
/** Enriches a Portal Inmobiliario listing with its detail page (specs, coordinates, publisher, dates). */
export function parsePiDetail(html: string, l: Listing): Listing {
  const s = html.replace(/\\u002F/g, '/');
  const spec = (name: string) => { const m = s.match(new RegExp(`\\{"id":"${name}","text":"([^"]+)"\\}`)); return m ? m[1] : null; };
  l.m2Total = num(spec('Superficie total')) ?? l.m2Total;
  if (l.m2UtilMax === null) l.m2Util = num(spec('Superficie útil')) ?? l.m2Util;
  if (l.bedroomsMax === null) l.bedrooms = num(spec('Dormitorios')) ?? l.bedrooms;
  if (l.bathroomsMax === null) l.bathrooms = num(spec('Baños')) ?? l.bathrooms;
  l.parking = num(spec('Estacionamientos')) ?? l.parking;
  const ll = s.match(/"map_info":\{[^]*?"latitude":"?(-?\d+\.\d+)"?,"longitude":"?(-?\d+\.\d+)/);
  if (ll) { l.lat = Number(ll[1]); l.lon = Number(ll[2]); }
  const sub = s.match(/"subtitle":"[^"|]*\|\s*(Publicado[^"]*)"/);
  if (sub) {
    l.publishedText = sub[1].trim();
    for (const [re, d] of RELATIVE) { const m = l.publishedText.match(re); if (m) { const days = d >= 0 ? d : Number(m[1]) * -d; l.publishedAt = new Date(Date.parse(l.scrapedAt) - days * 864e5).toISOString().slice(0, 10); break; } }
  }
  const seller = s.match(/"seller_name":\{"title":\{"text":"([^"]+)"/); if (seller) l.publisher = seller[1];
  if (!l.isNewProject) l.publisherType = /"header_store"|official-store|Corredora|Propiedades|Inmobiliaria/i.test(s.slice(0, 400000)) && l.publisher ? 'corredora' : 'particular';
  const imgs = [...new Set([...s.matchAll(/"id":"(\d+-MLC\d+_\d+)"/g)].map((m) => m[1]))];
  if (imgs.length) l.images = imgs.slice(0, 30).map((id) => `https://http2.mlstatic.com/D_NQ_NP_${id}-O.webp`);
  return l;
}

// ---------------- TocToc ----------------
export function toctocSearchUrl(op: string, type: string, comuna: string, region: string) {
  return `https://www.toctoc.com/${op}/${type}/${slug(region)}/${slug(comuna)}`;
}
export function parseToctocSearch(html: string, op: string, type: string, now: string): { listings: Listing[]; total: number | null } {
  const i = html.indexOf('id="__NEXT_DATA__"'); if (i < 0) return { listings: [], total: null };
  const j = html.indexOf('>', i), k = html.indexOf('</script>', j);
  const pp = JSON.parse(html.slice(j + 1, k))?.props?.pageProps;
  const res = pp?.propiedades?.results ?? [];
  const listings = res.map((r: any) => {
    const l = blank('toctoc', op, type, now);
    l.id = `toctoc-${r.hashId ?? r.idProperty}`; l.url = r.urlFicha || null; l.title = r.titulo ?? null;
    l.isNewProject = /nuevo/i.test(r.tipoOperacion ?? '') || r.idOperationFamily === 2;
    // TocToc shows both currencies, the converted one rounded; keep only the native one and convert later.
    let uf: number | null = null, clp: number | null = null;
    for (const p of r.precios ?? []) { if (p.prefix === 'UF') uf = num(p.value); if (p.prefix === '$') clp = num(p.value); }
    l.currency = r.currencyType === 2 ? 'UF' : 'CLP';
    l.price = l.currency === 'UF' ? uf : clp;
    if (l.isNewProject) l.pricePrefix = 'Desde';
    const pair = (a: any[] | undefined): [number | null, number | null] => { const v = (a ?? []).map(num).filter((x: any) => x) as number[]; return [v[0] ?? null, v.length > 1 ? v[v.length - 1] : null]; };
    [l.m2Util, l.m2UtilMax] = pair(r.superficie); [l.bedrooms, l.bedroomsMax] = pair(r.dormitorios); [l.bathrooms, l.bathroomsMax] = pair(r.bannos);
    l.comuna = r.comuna ?? null; l.region = r.region ?? null; l.lat = r.latitud ?? null; l.lon = r.longitud ?? null;
    l.publisher = r.imagenInmobiliaria?.alt || null;
    l.publisherType = r.idClientType === 3 ? 'inmobiliaria' : r.idClientType === 2 ? 'corredora' : r.idClientType === 1 ? 'particular' : null;
    if (typeof r.horasPublicado === 'number') { l.publishedAt = new Date(Date.parse(now) - r.horasPublicado * 36e5).toISOString().slice(0, 10); l.publishedText = `${r.horasPublicado} h ago`; }
    l.images = (r.galeriaImagenes?.length ? r.galeriaImagenes : r.imagenPrincipal?.src ? [r.imagenPrincipal.src] : []).slice(0, 30);
    return l;
  });
  return { listings, total: pp?.propiedades?.total ?? pp?.totalPropiedades ?? null };
}
