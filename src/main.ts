import { Actor, log } from 'apify';
import { gotScraping } from 'crawlee';
import { Listing, piSearchUrl, parsePiSearch, parsePiDetail, toctocSearchUrl, parseToctocSearch, finalize } from './parsers.js';

interface Input {
  sources?: ('portalinmobiliario' | 'toctoc')[]; operation?: 'venta' | 'arriendo'; propertyType?: string;
  region?: string; comunas?: string[]; minPrice?: number; maxPrice?: number; priceCurrency?: 'UF' | 'CLP';
  includeNewProjects?: boolean; includeDetails?: boolean; maxItems?: number; maxItemsPerComuna?: number; proxyConfiguration?: any;
}
await Actor.init();
const input = (await Actor.getInput<Input>()) ?? {};
const op = input.operation ?? 'venta', type = input.propertyType ?? 'departamento', region = input.region ?? 'metropolitana';
const comunas = (input.comunas ?? []).map((c) => c.trim()).filter(Boolean);
if (!comunas.length) throw new Error('Input error: add at least one comuna, e.g. "Providencia".');
const sources = input.sources?.length ? input.sources : ['portalinmobiliario'];
const maxItems = input.maxItems ?? 100, perComuna = input.maxItemsPerComuna ?? 0;
const cur = input.priceCurrency ?? (op === 'venta' ? 'UF' : 'CLP');
const includeDetails = input.includeDetails ?? true, includeNew = input.includeNewProjects ?? true;
const now = new Date().toISOString();

// UF value (CLP) from mindicador.cl; fallback to a recent value.
const proxy = await Actor.createProxyConfiguration(input.proxyConfiguration ?? { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'], apifyProxyCountry: 'CL' });
let uf = 0;
for (const [url, viaProxy] of [['https://mindicador.cl/api/uf', false], ['https://mindicador.cl/api/uf', true], ['https://api.boostr.cl/economy/indicator/uf.json', true]] as const) {
  try { const r: any = await gotScraping({ url, proxyUrl: viaProxy ? await proxy?.newUrl() : undefined, responseType: 'json', timeout: { request: 20000 }, retry: { limit: 1 } } as any); const v = r.body?.serie?.[0]?.valor ?? r.body?.data?.value; if (v > 10000) { uf = v; break; } } catch (e) { log.debug(`UF ${url}: ${(e as Error).message}`); }
}
if (!uf) { // fallback: derive it from a TocToc listing that shows both UF and CLP prices
  try {
    const h: any = await gotScraping({ url: 'https://www.toctoc.com/venta/departamento/metropolitana/providencia', proxyUrl: await proxy?.newUrl(), timeout: { request: 60000 } } as any);
    const m = String(h.body).match(/"precios":\[\{"order":0,"prefix":"UF","value":"([\d.]+)"\},\{"order":1,"prefix":"\$","value":"([\d.]+)"\}\],"currencyType":2/);
    if (m) { const v = Number(m[2].replace(/\./g, '')) / Number(m[1].replace(/\./g, '')); if (v > 10000) { uf = Math.round(v * 100) / 100; log.info('UF value derived from TocToc prices.'); } }
  } catch (e) { log.debug((e as Error).message); }
}
if (!uf) { uf = 41200; log.warning(`Could not fetch today's UF value, using ${uf} CLP.`); }
log.info(`UF = ${uf} CLP`);

async function getHtml(url: string): Promise<string> {
  let last = '';
  for (let a = 0; a < 5; a++) {
    try {
      const r: any = await gotScraping({ url, proxyUrl: await proxy?.newUrl(`s${Math.random().toString(36).slice(2, 8)}`), timeout: { request: 60000 }, headerGeneratorOptions: { browsers: ['chrome'], devices: ['desktop'], locales: ['es-CL', 'es'] } } as any);
      if (/account-verification|captcha/.test(r.url)) { last = 'anti-bot verification page'; continue; }
      if (r.statusCode === 404) throw new Error('HTTP 404 (check the comuna / region spelling)');
      if (r.statusCode >= 400) { last = `HTTP ${r.statusCode}`; continue; }
      return r.body;
    } catch (e) { if (/404/.test((e as Error).message)) throw e; last = (e as Error).message; }
  }
  throw new Error(`Could not fetch ${url}: ${last}`);
}

let pushed = 0; const summary: any[] = []; const seen = new Set<string>();
const inRange = (l: Listing) => {
  const p = cur === 'UF' ? l.priceUF : l.priceCLP;
  if (p === null) return !(input.minPrice || input.maxPrice);
  return (!input.minPrice || p >= input.minPrice) && (!input.maxPrice || p <= input.maxPrice);
};
async function emit(l: Listing): Promise<boolean> {
  if (pushed >= maxItems) return false;
  if (seen.has(l.id)) return true; seen.add(l.id);
  if (!includeNew && l.isNewProject) return true;
  finalize(l, uf);
  if (!inRange(l)) return true;
  await Actor.pushData(l, 'result'); pushed++; // pay-per-event: one charge per listing
  return pushed < maxItems;
}

outer: for (const src of sources) for (const comuna of comunas) {
  if (pushed >= maxItems) break outer;
  const start = pushed; let pages = 0, found: number | null = null;
  const cap = () => perComuna > 0 && pushed - start >= perComuna;
  try {
    if (src === 'portalinmobiliario') {
      for (let off = 0; off < 2016 && !cap(); off += 48) {
        const { listings, total } = parsePiSearch(await getHtml(piSearchUrl(op, type, comuna, region, off, { min: input.minPrice, max: input.maxPrice, cur })), op, type, now);
        pages++; found ??= total;
        if (!listings.length) break;
        for (const l of listings) {
          if (cap() || pushed >= maxItems) break;
          l.region = region;
          if (!includeNew && l.isNewProject) continue;
          if (!inRange(finalize({ ...l }, uf))) continue; // filter before the (slow) detail page
          if (includeDetails && l.url) { try { parsePiDetail(await getHtml(l.url), l); } catch (e) { log.warning(`${l.id}: detail page failed (${(e as Error).message}); keeping search data.`); } }
          if (!(await emit(l))) break;
        }
        if (pushed >= maxItems || (total !== null && off + 48 >= total)) break;
      }
    } else if (src === 'toctoc') {
      const { listings, total } = parseToctocSearch(await getHtml(toctocSearchUrl(op, type, comuna, region)), op, type, now);
      pages++; found = total;
      if (total && total > listings.length) log.info(`toctoc/${comuna}: ${total} listings exist, the first ${listings.length} are available per search.`);
      for (const l of listings) { if (cap() || !(await emit(l))) break; }
    } else throw new Error(`Unknown source ${src}`);
    summary.push({ source: src, comuna, totalOnSite: found, pages, results: pushed - start });
    log.info(`${src}/${comuna}: ${pushed - start} results (${found ?? '?'} on site).`);
  } catch (e) { summary.push({ source: src, comuna, error: (e as Error).message }); log.error(`${src}/${comuna}: ${(e as Error).message}`); }
}
await Actor.setValue('OUTPUT', { scrapedAt: now, ufValueCLP: uf, results: pushed, searches: summary });
if (pushed === 0 && summary.every((s) => s.error)) await Actor.fail('Every search failed. See the log.');
else await Actor.exit(`Scraped ${pushed} listings.`);
