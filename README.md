# Chile Real Estate Scraper – Portal Inmobiliario & TocToc

Scrape **Chilean property listings** — *departamentos, casas, oficinas, terrenos* **en venta y arriendo** — from **Portal Inmobiliario** (Mercado Libre) and **TocToc**, for any comuna of **Santiago** and the rest of **Chile**. Every row comes with the price in **UF and CLP**, the **price per m² (UF/m², $/m²)**, m² útiles / totales, dormitorios, baños, estacionamientos, comuna, address, **coordinates**, publisher (corredora / inmobiliaria / particular), publish date and photos.

No login, no API key: public listing pages only.

## ✨ Why this scraper

- **Two portals, one schema.** Portal Inmobiliario and TocToc rows share the same fields, so you can compare or merge them.
- **UF and CLP on every row.** Prices are converted with today's official UF value (mindicador.cl), so *arriendo* (CLP) and *venta* (UF) are comparable.
- **Price per m² computed for you** — the number brokers, appraisers and investors actually need.
- **New projects flagged.** `isNewProject` + `pricePrefix: "Desde"` + ranges (`m2UtilMax`, `bedroomsMax`) so “from” prices don't pollute your averages. Turn them off with `includeNewProjects: false`.
- **Server-side price filter** on Portal Inmobiliario (`minPrice`/`maxPrice` in UF or CLP).
- **Chilean residential proxy by default**, retries and partial results: one failing comuna does not kill the run.

## 🎯 Use cases

- Rent and sale price benchmarks by comuna (*precio por m² Providencia, Ñuñoa, Las Condes…*).
- Investment screening: cap rates using `arriendo` vs `venta` UF/m² in the same comuna.
- Lead lists of real-estate agencies (*corredoras de propiedades*) active in an area.
- Daily / weekly market monitoring with Apify **Schedules** → Google Sheets, Slack or a webhook.
- Feeding AI agents via the [Apify MCP server](https://mcp.apify.com).

## 📥 Input

| Field | Type | Description | Example |
|---|---|---|---|
| `comunas` | string[] (**required**) | Comunas to search. Accents optional. | `["Providencia", "Ñuñoa"]` |
| `region` | select | Region of those comunas. | `metropolitana` |
| `operation` | `venta` \| `arriendo` | Sale or rent. | `arriendo` |
| `propertyType` | select | `departamento`, `casa`, `oficina`, `terreno`, `local-comercial`, `bodega`, `estacionamiento`, `parcela` (TocToc: first four). | `departamento` |
| `sources` | array | `portalinmobiliario`, `toctoc`. | `["portalinmobiliario","toctoc"]` |
| `minPrice` / `maxPrice` | integer | Price range in `priceCurrency`. | `400000` / `700000` |
| `priceCurrency` | `UF` \| `CLP` | Default UF for venta, CLP for arriendo. | `CLP` |
| `maxItems` | integer | Max results for the run (you pay per result). | `100` |
| `maxItemsPerComuna` | integer | Spread results evenly across comunas (0 = off). | `25` |
| `includeNewProjects` | boolean | Include new developments (*proyectos nuevos*). | `true` |
| `includeDetails` | boolean | Portal Inmobiliario: open each listing for m² totales, estacionamientos, coordinates, date, photos. | `true` |
| `proxyConfiguration` | proxy | Default: Apify residential, Chile. | |

```json
{
  "comunas": ["Santiago", "Ñuñoa"],
  "operation": "arriendo",
  "propertyType": "departamento",
  "sources": ["portalinmobiliario", "toctoc"],
  "minPrice": 400000,
  "maxPrice": 700000,
  "includeNewProjects": false,
  "maxItems": 50
}
```

## 📤 Output

One item per listing (dataset views: **Listings**, **Location**, **Photos**). Run summary per comuna in the `OUTPUT` record.

```json
{
  "source": "portalinmobiliario",
  "id": "MLC2344399113",
  "url": "https://www.portalinmobiliario.com/MLC-2344399113-gran-departamento-para-remodelar-a-tu-gusto-_JM",
  "title": "Gran Departamento Para Remodelar A Tu Gusto",
  "operation": "venta",
  "propertyType": "departamento",
  "isNewProject": false,
  "price": 13490,
  "currency": "UF",
  "priceUF": 13490,
  "priceCLP": 555788000,
  "pricePrefix": null,
  "m2Util": 240,
  "m2Total": 278,
  "m2UtilMax": null,
  "bedrooms": 4,
  "bathrooms": 3,
  "parking": 2,
  "comuna": "Providencia",
  "region": "metropolitana",
  "address": "Carmen Sylva / Avenida El Bosque, Las Lilas, Providencia",
  "lat": -33.424003,
  "lon": -70.597871,
  "publisher": "Ascui Propiedades",
  "publisherType": "corredora",
  "publishedAt": "2026-10-13",
  "publishedText": "Publicado esta semana",
  "images": ["https://http2.mlstatic.com/D_NQ_NP_764419-MLC118028151666_102026-O.webp"],
  "pricePerM2UF": 56.21,
  "pricePerM2CLP": 2315783,
  "scrapedAt": "2026-10-20T16:17:28.434Z"
}
```

| Field | Notes |
|---|---|
| `price`, `currency` | Price as published (`UF` or `CLP`). `priceUF` / `priceCLP` are both always filled. |
| `pricePerM2UF`, `pricePerM2CLP` | Price ÷ m² útiles (or totales). Empty for new projects with ranges. |
| `m2UtilMax`, `bedroomsMax`, `bathroomsMax` | Upper end of a range (new projects). |
| `publisherType` | `corredora`, `inmobiliaria` or `particular` (best effort). |
| `publishedAt` | Approximate date derived from “Publicado hace…” (Portal Inmobiliario) or hours online (TocToc). |

## 🧭 Sources compared

| | Portal Inmobiliario | TocToc |
|---|---|---|
| Coverage | Largest Chilean portal (Mercado Libre) | Strong in new projects and Santiago |
| Per search | Up to ~2,000 listings (48 per page) | First 260 listings per comuna/type |
| Coordinates | With `includeDetails` | Always |
| Parking / m² totales | With `includeDetails` | Not on search pages |
| Speed | ~5–10 s per listing with details, fast without | Very fast (one page per comuna) |

## ❓ FAQ

- **Is it legal?** It collects publicly visible listing data from search pages allowed by each site's robots.txt, at a gentle pace. Don't use it to collect personal data or to republish photos without permission.
- **Why “Desde” prices?** New developments advertise a starting price; check `isNewProject`.
- **Why a residential proxy?** Both portals block datacenter IPs with a verification page.
- **Duplicates across portals?** The same unit can appear on both portals; IDs differ. Match on `address`/`lat`/`lon` + `m2Util` if you need to merge.
- **Yapo.cl?** Not yet supported (planned).

**Keywords:** arriendo departamentos Santiago, venta de casas Chile, precio UF por m², propiedades en venta, departamentos en arriendo Providencia, Ñuñoa, Las Condes, Portal Inmobiliario scraper, TocToc scraper, corredoras de propiedades, real estate Chile data.
