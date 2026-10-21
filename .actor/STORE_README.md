# Chile Real Estate & Propiedades – Portal Inmobiliario, TocToc

Saca departamentos, casas, oficinas y terrenos en venta o arriendo de Portal Inmobiliario y TocToc, por comuna, con el precio en UF y en pesos, el precio por m², dormitorios, baños, superficie y coordenadas. Lo uso para comparar comunas sin abrir aviso por aviso.

![Formulario con comunas de Santiago](https://raw.githubusercontent.com/ENER90/chile-real-estate-scraper/main/docs/screenshots/01-input.png)

## Qué datos obtienes

| Campo | Ejemplo real | Comentario |
|---|---|---|
| `title`, `url`, `source` | "Vive Santa Isabel", link, `portalinmobiliario` | De qué portal viene |
| `priceUF` / `priceCLP` | `8.01` / `330000` | Siempre en las dos monedas, con la UF del día |
| `pricePerM2UF` / `pricePerM2CLP` | `0.31` / `12692` | Solo en unidades con superficie única, no en proyectos con rango |
| `bedrooms`, `bathrooms` | `1`, `1` | En proyectos nuevos también vienen `bedroomsMax` y `bathroomsMax` |
| `m2Util`, `m2Total` | `26`, … | Superficie útil y total |
| `comuna`, `address`, `lat`, `lon` | Santiago, "Av. Sta. Rosa 537…", -33.45, -70.64 | Para mapas |
| `isNewProject`, `pricePrefix` | `true`, "Desde" | Si es un proyecto nuevo o un aviso normal |
| `publisher`, `publisherType`, `images` | "Assetplan Chile", `inmobiliaria` | Quién publica y las fotos |

![Tabla con propiedades reales en arriendo](https://raw.githubusercontent.com/ENER90/chile-real-estate-scraper/main/docs/screenshots/02-output-table.png)

## Cuánto cuesta

US$0,003 por propiedad, o sea US$3 por cada 1.000 propiedades.

| Ejemplo | Propiedades | Costo |
|---|---|---|
| Una comuna, para mirar | 20 | US$0,06 |
| 4 comunas × 50 | 200 | US$0,60 |
| Toda la RM en arriendo, una vez | 1.000 | US$3,00 |

Con el plan gratis de Apify (US$5 al mes) te alcanza para unas 1.600 propiedades al mes. Con **Max results** pones el tope y nunca pagas más que eso. Una ejecución real con 40 propiedades de 4 comunas y los dos portales tardó unos 4 minutos, porque abre cada aviso para sacar más datos. Si desmarcas **Open listing pages** va más rápido.

## Cómo usarlo

1. Crea una cuenta gratis en Apify y abre este actor.
2. En **Comunas** escribe las comunas que quieres, por ejemplo `Providencia` y `Ñuñoa`, y en **Region** elige la región.
3. En **Operation** elige `venta` o `arriendo`, y en **Property type** el tipo (`departamento`, `casa`, `oficina`…).
4. En **Sources** marca Portal Inmobiliario, TocToc o los dos.
5. Si quieres, filtra por precio con **Min price** / **Max price** y elige la moneda en **Price currency** (UF o CLP).
6. Pon un tope en **Max results** (20 para probar) y, si buscas en varias comunas, usa **Max results per comuna** para repartir.
7. Aprieta **Start** y baja la tabla como Excel desde la pestaña **Output**.

## Ejemplo de entrada

```json
{
  "comunas": ["Santiago", "Providencia", "Ñuñoa", "Las Condes"],
  "region": "metropolitana",
  "operation": "arriendo",
  "propertyType": "departamento",
  "sources": ["portalinmobiliario", "toctoc"],
  "maxItems": 40,
  "maxItemsPerComuna": 5
}
```

## Ejemplo de salida

![Una propiedad completa en JSON](https://raw.githubusercontent.com/ENER90/chile-real-estate-scraper/main/docs/screenshots/03-output-json.png)

## Para qué sirve

- Comparar el precio por m² entre comunas antes de comprar o arrendar.
- Si eres corredor o inversionista, seguir las propiedades nuevas en las comunas que trabajas (con un Schedule diario).
- Armar un mapa con `lat` y `lon` en Google Sheets, Looker Studio o QGIS.
- Estudiar arriendos en proyectos de renta residencial (multifamily).

## Integraciones

- **Excel, CSV o Google Sheets:** desde la pestaña Output, o con la integración de Google Sheets de Apify.
- **Make, Zapier y n8n:** app oficial de Apify, "Run Actor" (`ener90/chile-real-estate-scraper`) y luego "Get dataset items".
- **Webhook o Slack** al terminar cada ejecución, desde la pestaña Integrations.
- **API:**

```python
from apify_client import ApifyClient
client = ApifyClient("TU_TOKEN")
run = client.actor("ener90/chile-real-estate-scraper").call(run_input={"comunas": ["Ñuñoa"], "operation": "venta", "maxItems": 20})
for p in client.dataset(run["defaultDatasetId"]).iterate_items():
    print(p["title"], p.get("priceUF"), p.get("pricePerM2UF"))
```

- **Agentes de IA:** agrégalo a [Apify MCP](https://mcp.apify.com) y pregunta "¿cuánto cuesta el m² de un depto en Ñuñoa?".

## Limitaciones

- TocToc solo tiene departamento, casa, oficina y terreno.
- Los resultados no se deduplican entre portales: si la misma propiedad está en los dos, sale dos veces.
- El precio por m² no se calcula en proyectos que publican un rango de superficies, porque sería engañoso.
- Los portales bloquean IPs de datacenter, por eso viene configurado con proxy residencial chileno (en **Advanced**).

## Preguntas frecuentes

**¿De dónde sale el valor de la UF?** De la UF del día de la ejecución. Con ella se calcula la moneda que el aviso no trae.

**¿Puedo incluir o excluir proyectos nuevos?** Sí, con **Include new projects (proyectos)**. Los proyectos muestran un precio "Desde" y rangos de m², dormitorios y baños.

**¿Es legal?** Solo saca avisos públicos. Revisa igual los términos de cada portal para tu caso.

## Otros actores míos

- [Mercado Libre Reviews & Preguntas](https://apify.com/ener90/mercadolibre-reviews-questions)
- [Mercado Libre Price Tracker](https://apify.com/ener90/mercadolibre-seller-price-monitor)

In English: this Actor scrapes Chilean property listings for sale or rent from Portal Inmobiliario and TocToc, by comuna. Each listing comes with its price in UF and CLP, price per m² (for single units), bedrooms, bathrooms, size, coordinates and publisher. It costs US$3 per 1,000 listings, and **Max results** caps your spend.
