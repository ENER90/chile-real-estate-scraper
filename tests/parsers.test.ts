import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parsePiSearch, parsePiDetail, parseToctocSearch, piSearchUrl, toctocSearchUrl, finalize, slug } from '../src/parsers.js';
const fx = (f: string) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');
const now = '2026-10-20T15:00:00.000Z';
describe('urls', () => {
  it('builds PI urls', () => {
    expect(piSearchUrl('venta', 'departamento', 'Ñuñoa', 'Metropolitana', 0)).toBe('https://www.portalinmobiliario.com/venta/departamento/nunoa-metropolitana');
    expect(piSearchUrl('arriendo', 'casa', 'Las Condes', 'metropolitana', 48, { min: 400000, max: 700000, cur: 'CLP' })).toBe('https://www.portalinmobiliario.com/arriendo/casa/las-condes-metropolitana/_Desde_49_PriceRange_400000CLP-700000CLP_NoIndex_True');
    expect(toctocSearchUrl('venta', 'departamento', 'Providencia', 'Metropolitana')).toBe('https://www.toctoc.com/venta/departamento/metropolitana/providencia');
    expect(slug('Estación Central')).toBe('estacion-central');
  });
});
describe('portal inmobiliario', () => {
  it('parses search cards', () => {
    const { listings, total } = parsePiSearch(fx('pi-search.html'), 'venta', 'departamento', now);
    expect(total).toBeGreaterThan(1000); expect(listings.length).toBe(48);
    const l = listings.find((x) => x.id === 'MLC2344399113')!;
    expect(l).toMatchObject({ price: 13490, currency: 'UF', bedrooms: 4, bathrooms: 3, m2Util: 240, comuna: 'Providencia', publisher: 'Ascui Propiedades' });
    expect(l.url).toContain('portalinmobiliario.com/MLC-2344399113');
  });
  it('enriches from detail page', () => {
    const l = parsePiSearch(fx('pi-search.html'), 'venta', 'departamento', now).listings.find((x) => x.id === 'MLC2344399113')!;
    finalize(parsePiDetail(fx('pi-detail.html'), l), 40000);
    expect(l).toMatchObject({ m2Total: 278, parking: 2, lat: -33.424003, lon: -70.597871 });
    expect(l.publishedText).toMatch(/Publicado/); expect(l.pricePerM2UF).toBeCloseTo(13490 / 240, 1); expect(l.images.length).toBeGreaterThan(1);
  });
});
describe('toctoc', () => {
  it('parses __NEXT_DATA__', () => {
    const { listings, total } = parseToctocSearch(fx('toctoc-search.html'), 'venta', 'departamento', now);
    expect(total).toBe(1537); expect(listings.length).toBe(260);
    const l = listings.find((x) => x.title?.startsWith('Penthouse 3D/3B'))!;
    expect(l).toMatchObject({ price: 15422, currency: 'UF', m2Util: 197, bedrooms: 3, publisherType: 'corredora', comuna: 'Providencia' });
    expect(l.lat).toBeCloseTo(-33.4449, 3);
  });
});
