# Chile Real Estate Scraper – Portal Inmobiliario & TocToc (Propiedades, Arriendo y Venta)

🇪🇸 **Español** · 🇬🇧 [English](#english)

Extrae **avisos de propiedades en Chile** — *departamentos, casas, oficinas, terrenos* **en venta y arriendo** — desde **Portal Inmobiliario** (Mercado Libre) y **TocToc**, para cualquier comuna de **Santiago** y del resto de **Chile**. Cada fila trae el precio en **UF y CLP**, el **precio por m² (UF/m² y $/m²)**, m² útiles y totales, dormitorios, baños, estacionamientos, comuna, dirección, **coordenadas**, quién publica (corredora, inmobiliaria o particular), fecha de publicación y fotos.

Sin login ni API key: solo páginas públicas de avisos.

## ✨ Por qué este scraper

- **Dos portales, un solo formato.** Las filas de Portal Inmobiliario y TocToc tienen los mismos campos, así que puedes compararlas o juntarlas.
- **UF y CLP en cada fila.** Los precios se convierten con el valor oficial de la UF del día (mindicador.cl), para que los *arriendos* (CLP) y las *ventas* (UF) sean comparables.
- **Precio por m² ya calculado**, el dato que de verdad usan corredores, tasadores e inversionistas.
- **Proyectos nuevos marcados.** `isNewProject` + `pricePrefix: "Desde"` + rangos (`m2UtilMax`, `bedroomsMax`), para que los precios "desde" no ensucien tus promedios. Desactívalos con `includeNewProjects: false`.
- **Filtro de precio en el servidor** de Portal Inmobiliario (`minPrice`/`maxPrice` en UF o CLP).
- **Proxy residencial chileno por defecto**, reintentos y resultados parciales: si falla una comuna, no se cae toda la ejecución.

## 🎯 Casos de uso

- Referencias de precios de arriendo y venta por comuna (*precio por m² en Providencia, Ñuñoa, Las Condes…*).
- Evaluación de inversiones: rentabilidad (cap rate) comparando UF/m² de `arriendo` y `venta` en la misma comuna.
- Listas de contactos de corredoras de propiedades activas en una zona.
- Monitoreo diario o semanal del mercado con **Schedules** de Apify → Google Sheets, Slack o un webhook.
- Alimentar agentes de IA con el [servidor Apify MCP](https://mcp.apify.com).

## 📥 Entrada

| Campo | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `comunas` | string[] (**obligatorio**) | Comunas a buscar. Los tildes son opcionales. | `["Providencia", "Ñuñoa"]` |
| `region` | lista | Región de esas comunas. | `metropolitana` |
| `operation` | `venta` \| `arriendo` | Venta o arriendo. | `arriendo` |
| `propertyType` | lista | `departamento`, `casa`, `oficina`, `terreno`, `local-comercial`, `bodega`, `estacionamiento`, `parcela` (TocToc: los cuatro primeros). | `departamento` |
| `sources` | arreglo | `portalinmobiliario`, `toctoc`. | `["portalinmobiliario","toctoc"]` |
| `minPrice` / `maxPrice` | entero | Rango de precio en `priceCurrency`. | `400000` / `700000` |
| `priceCurrency` | `UF` \| `CLP` | Por defecto UF para venta y CLP para arriendo. | `CLP` |
| `maxItems` | entero | Máximo de resultados de la ejecución (pagas por resultado). | `100` |
| `maxItemsPerComuna` | entero | Reparte los resultados en partes iguales entre comunas (0 = desactivado). | `25` |
| `includeNewProjects` | booleano | Incluir *proyectos nuevos*. | `true` |
| `includeDetails` | booleano | Portal Inmobiliario: abre cada aviso para obtener m² totales, estacionamientos, coordenadas, fecha y fotos. | `true` |
| `proxyConfiguration` | proxy | Por defecto: proxy residencial de Apify en Chile. | |

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

## 📤 Salida

Un registro por aviso (vistas del dataset: **Listings**, **Location**, **Photos**). El resumen por comuna queda en el registro `OUTPUT`.

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

| Campo | Notas |
|---|---|
| `price`, `currency` | Precio tal como se publicó (`UF` o `CLP`). `priceUF` y `priceCLP` siempre vienen llenos. |
| `pricePerM2UF`, `pricePerM2CLP` | Precio ÷ m² útiles (o totales). Vacío en proyectos nuevos con rangos. |
| `m2UtilMax`, `bedroomsMax`, `bathroomsMax` | Límite superior de un rango (proyectos nuevos). |
| `publisherType` | `corredora`, `inmobiliaria` o `particular` (aproximado). |
| `publishedAt` | Fecha aproximada a partir de "Publicado hace…" (Portal Inmobiliario) o de las horas publicadas (TocToc). |

## 🧭 Comparación de fuentes

| | Portal Inmobiliario | TocToc |
|---|---|---|
| Cobertura | El portal más grande de Chile (Mercado Libre) | Fuerte en proyectos nuevos y Santiago |
| Por búsqueda | Hasta ~2.000 avisos (48 por página) | Primeros 260 avisos por comuna y tipo |
| Coordenadas | Con `includeDetails` | Siempre |
| Estacionamientos / m² totales | Con `includeDetails` | No aparecen en las páginas de búsqueda |
| Velocidad | ~5–10 s por aviso con detalles, rápido sin ellos | Muy rápido (una página por comuna) |

## ❓ Preguntas frecuentes

- **¿Es legal?** Recopila datos públicos de avisos desde páginas de búsqueda permitidas por el robots.txt de cada sitio, a un ritmo moderado. No lo uses para recopilar datos personales ni para republicar fotos sin permiso.
- **¿Por qué hay precios "Desde"?** Los proyectos nuevos publican un precio inicial; revisa `isNewProject`.
- **¿Por qué un proxy residencial?** Ambos portales bloquean las IPs de datacenter con una página de verificación.
- **¿Hay duplicados entre portales?** La misma unidad puede aparecer en los dos con IDs distintos. Si necesitas unirlos, cruza por `address`/`lat`/`lon` + `m2Util`.
- **¿Yapo.cl?** Todavía no (está planificado).

**Palabras clave:** arriendo departamentos Santiago, venta de casas Chile, precio UF por m², propiedades en venta, departamentos en arriendo Providencia, Ñuñoa, Las Condes, scraper Portal Inmobiliario, scraper TocToc, corredoras de propiedades, datos inmobiliarios Chile.

---

## English

Scrape **Chilean property listings** — *departamentos, casas, oficinas, terrenos* **en venta y arriendo** — from **Portal Inmobiliario** (Mercado Libre) and **TocToc**, for any comuna of **Santiago** and the rest of **Chile**. Every row comes with the price in **UF and CLP**, the **price per m² (UF/m², $/m²)**, m² útiles / totales, dormitorios, baños, estacionamientos, comuna, address, **coordinates**, publisher (corredora / inmobiliaria / particular), publish date and photos.

No login, no API key: public listing pages only.

### ✨ Why this scraper

- **Two portals, one schema.** Portal Inmobiliario and TocToc rows share the same fields, so you can compare or merge them.
- **UF and CLP on every row.** Prices are converted with today's official UF value (mindicador.cl), so *arriendo* (CLP) and *venta* (UF) are comparable.
- **Price per m² computed for you** — the number brokers, appraisers and investors actually need.
- **New projects flagged.** `isNewProject` + `pricePrefix: "Desde"` + ranges (`m2UtilMax`, `bedroomsMax`) so “from” prices don't pollute your averages. Turn them off with `includeNewProjects: false`.
- **Server-side price filter** on Portal Inmobiliario (`minPrice`/`maxPrice` in UF or CLP).
- **Chilean residential proxy by default**, retries and partial results: one failing comuna does not kill the run.

### 🎯 Use cases

- Rent and sale price benchmarks by comuna (*precio por m² Providencia, Ñuñoa, Las Condes…*).
- Investment screening: cap rates using `arriendo` vs `venta` UF/m² in the same comuna.
- Lead lists of real-estate agencies (*corredoras de propiedades*) active in an area.
- Daily / weekly market monitoring with Apify **Schedules** → Google Sheets, Slack or a webhook.
- Feeding AI agents via the [Apify MCP server](https://mcp.apify.com).

### 📥 Input

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

### 📤 Output

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

### 🧭 Sources compared

| | Portal Inmobiliario | TocToc |
|---|---|---|
| Coverage | Largest Chilean portal (Mercado Libre) | Strong in new projects and Santiago |
| Per search | Up to ~2,000 listings (48 per page) | First 260 listings per comuna/type |
| Coordinates | With `includeDetails` | Always |
| Parking / m² totales | With `includeDetails` | Not on search pages |
| Speed | ~5–10 s per listing with details, fast without | Very fast (one page per comuna) |

### ❓ FAQ

- **Is it legal?** It collects publicly visible listing data from search pages allowed by each site's robots.txt, at a gentle pace. Don't use it to collect personal data or to republish photos without permission.
- **Why “Desde” prices?** New developments advertise a starting price; check `isNewProject`.
- **Why a residential proxy?** Both portals block datacenter IPs with a verification page.
- **Duplicates across portals?** The same unit can appear on both portals; IDs differ. Match on `address`/`lat`/`lon` + `m2Util` if you need to merge.
- **Yapo.cl?** Not yet supported (planned).

**Keywords:** arriendo departamentos Santiago, venta de casas Chile, precio UF por m², propiedades en venta, departamentos en arriendo Providencia, Ñuñoa, Las Condes, Portal Inmobiliario scraper, TocToc scraper, corredoras de propiedades, real estate Chile data.
