# MountCrypto — Plan

App web para visualizar mercados financieros: bolsa (NASDAQ, IBEX35...), criptomonedas, crudos, divisas, empresas.

---

## Stack

| Capa           | Tecnología                                           |
| -------------- | ---------------------------------------------------- |
| Framework      | Next.js 15 (App Router)                              |
| Lenguaje       | TypeScript                                           |
| Estilos        | TailwindCSS v4                                       |
| Base de datos  | Supabase (Postgres)                                  |
| Autenticación  | Supabase Auth (email + OAuth)                        |
| APIs financieras | CoinGecko (crypto), Demo data (stocks, forex, commodities) |
| Animaciones    | GSAP + ScrollTrigger (landing page)                  |
| Despliegue     | Vercel (inicial) → Docker (futuro)                   |
| Tiempo real    | Supabase Realtime + polling                          |

---

## Arquitectura de rutas

```
/                         → Landing page (hero, about, pricing, testimonials, demo)
/login                    → Auth (login)
/register                 → Auth (register)
/auth/callback            → OAuth callback
/dashboard                → Dashboard principal (bento grid overview)
/dashboard/markets        → Vista por mercados (indices + stocks)
/dashboard/crypto         → Criptomonedas (top 100 CoinGecko)
/dashboard/forex          → Divisas (8 major pairs)
/dashboard/commodities    → Materias primas (crudo, oro, etc.)
/assets/[symbol]          → Detalle de un activo (precio, gráfico, stats)
/watchlist                → Watchlist del usuario autenticado
/portfolio                → Portfolio del usuario autenticado
/settings                 → Ajustes de cuenta
```

---

## Schema Supabase (tablas)

### `profiles`
- Extiende `auth.users`
- `id` UUID PK → `auth.users.id`
- `display_name` text
- `avatar_url` text
- `created_at` timestamptz

### `watchlists`
- `id` UUID PK
- `user_id` UUID FK → `profiles.id`
- `name` text (ej. "Mi watchlist")
- `created_at` timestamptz

### `watchlist_assets`
- `id` UUID PK
- `watchlist_id` UUID FK → `watchlists.id` ON DELETE CASCADE
- `symbol` text (ej. "AAPL", "BTC-USD")
- `asset_type` text (stock / crypto / forex / commodity)
- `added_at` timestamptz
- Unique constraint: (watchlist_id, symbol)

### `portfolio_holdings`
- `id` UUID PK
- `user_id` UUID FK → `profiles.id`
- `symbol` text
- `asset_type` text
- `quantity` numeric
- `avg_price` numeric
- `created_at` timestamptz
- `updated_at` timestamptz

### `portfolio_transactions`
- `id` UUID PK
- `holding_id` UUID FK → `portfolio_holdings.id` ON DELETE CASCADE
- `type` text (buy / sell)
- `quantity` numeric
- `price` numeric
- `executed_at` timestamptz

---

## APIs financieras

| API              | Coverage                    | Límites                          |
| ---------------- | --------------------------- | -------------------------------- |
| **Yahoo Finance** | Stocks, indices, forex, commodities, news | Sin API key, ~15 min delay (free) |
| **CoinGecko**    | Criptomonedas               | 10-30 req/min (free)            |

**Estrategia**: Servidor Next.js actúa como proxy (Route Handlers). Yahoo Finance sin API key, ~15 min delayed. CoinGecko con ISR 60s. Cache en memoria (60s TTL) en `fetchChanges` para reducir llamadas.

---

## Features por fase

### Fase 1 — MVP (dashboard completo)
- [x] Proyecto Next.js inicializado
- [x] Autenticación con Supabase (email + OAuth)
- [x] Layout base con sidebar, navbar, market ticker, bottom panel
- [x] Dashboard principal con bento grid (indices, crypto spotlight, top movers, forex, commodities)
- [x] Vista de mercado (indices + stocks) con tabla paginada y búsqueda
- [x] Vista de criptomonedas con datos de CoinGecko, sparklines y paginación
- [x] Vista de divisas (8 major pairs)
- [x] Vista de commodities (oro, crudo, gas, metales, agrícolas)
- [x] Página de detalle de activo con gráfico interactivo (Recharts + timeframe selector)
- [x] Búsqueda global de activos (cmd+k / "/")
- [x] Landing page con hero (ASCII mountains animated, GSAP scroll pin, sections)
- [x] Rediseño TradingView (paleta #131722, teal/coral, tablas densas)
- [x] Watchlists del usuario (CRUD con Supabase)

### Fase 2 — Portfolio y datos personales
- [x] Portfolio tracker (CRUD holdings con cantidades y precio medio)
- [x] Historial de transacciones (buy/sell por holding)
- [x] Portfolio summary (valor total, P&L diario, retorno total)
- [x] Asset allocation (gráfico de torta por tipo y por holding)
- [x] Live pricing en holdings (precio actual vs precio medio → P&L)
- [x] Exportar portfolio a CSV
- [x] Ajustes de perfil (display name, avatar, preferencias)
- [x] Preferencias de moneda (USD/EUR/GBP)
- [x] Watchlist reorder (position column en watchlist_assets + server action)
- [x] Alertas de precio (CRUD con Supabase + página dedicada)

### Fase 3 — Tiempo real y social
- [x] Precios en tiempo real (polling cada 10s via `usePolling` hook)
- [x] Noticias financieras integradas (Yahoo Finance + scraping BBC/NYT/Bild/Economist)
- [x] Compartir watchlists / portfolios (share token + páginas públicas)

### Fase 4 — Algoritmia y análisis técnico
- [ ] Screener de mercado (filtrar por cambio %, volumen, capitalización, sector)
- [ ] Indicadores técnicos en el gráfico de velas (RSI, MACD, SMA, EMA, Bandas de Bollinger)
- [ ] Scanner de patrones de velas (envolvente, doji, martillo, estrella fugaz)
- [ ] Alertas avanzadas (activadas por indicadores técnicos, no solo precio)
- [ ] Comparativa de activos (superponer múltiples símbolos en el mismo gráfico)
- [ ] Watchlist sincronizada con el gráfico (click en símbolo → abre detalle)
- [ ] Heatmap del mercado por sector / capitalización

### Fase 5 — Social, mobile y expansión
- [ ] Comentarios y discusión por activo (comunidad)
- [ ] Rankings públicos de portfolios (P&L, sharpe ratio, drawdown)
- [ ] Notificaciones push (Web Push API + Supabase Realtime)
- [ ] PWA (manifest + service worker + offline fallback)
- [ ] Modo oscuro / claro persistente en preferencias
- [ ] Exportación de informes PDF (P&L mensual, cartera, histórico)
- [ ] API pública con rate limiting para terceros (App Router + API keys)
- [ ] Integración con brokers (Alpaca, Interactive Brokers — paper trading)

---

## Diseño (TradingView Inspired)

- **Fondo**: `#131722`
- **Superficies**: `#1e222d`
- **Cards**: `#2a2e39`
- **Hover**: `#323542`
- **Bordes**: `#363a45`
- **Texto principal**: `#d1d4dc`
- **Texto secundario**: `#787b86`
- **Verde (subida)**: `#089981` (teal)
- **Rojo (bajada)**: `#f23645` (coral)
- **Acento**: `#2962ff` (azul)

Tipografía: Inter (UI), JetBrains Mono (datos numéricos), Space Grotesk (display — landing page).

---

## Estructura de componentes

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── Navbar.tsx
│   ├── MarketTicker.tsx
│   ├── BottomPanel.tsx
│   └── GlobalSearch.tsx
├── landing/
│   ├── Nav.tsx
│   ├── HeroSection.tsx
│   ├── AsciiMountains.tsx
│   ├── AboutSection.tsx
│   ├── PricingSection.tsx
│   ├── TestimonialsSection.tsx
│   ├── DemoSection.tsx
│   ├── LandingAnimations.tsx
│   └── Footer.tsx
├── dashboard/
│   └── BentoOverview.tsx
├── markets/
│   ├── MarketIndices.tsx
│   └── StocksTable.tsx
├── crypto/
│   ├── CryptoTable.tsx
│   └── Sparkline.tsx
├── forex/
│   └── ForexTable.tsx
├── commodities/
│   └── CommoditiesTable.tsx
├── assets/
│   ├── AssetHeader.tsx
│   ├── AssetStats.tsx
│   ├── DemoAssetDetail.tsx
├── charts/
│   └── PriceChart.tsx
├── ui/
│   ├── DataTable.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
```

Gráficos: **Recharts** (líneas/área para sparklines y price chart). **TradingView Lightweight Charts** (velas — futuro).

---

## Notas técnicas

- **Server Components** para carga inicial de datos (SSR).
- **Client Components** solo donde se necesita interactividad (gráficos, búsqueda, formularios, landing).
- **Route Handlers** como proxy a APIs externas para ocultar API keys.
- **RLS en Supabase** para que cada usuario solo vea sus propios watchlists y portfolio.
- **Estructura de archivos**: feature-first dentro de `components/`, plano en `app/`.
- **GSAP** solo en la landing page (no afecta al bundle del dashboard).

---

## Commands

```bash
npm run dev        # Dev server con HMR
npm run lint       # ESLint
npm run build      # Production build (solo fuera de sesiones agente)
```

Orden para verificar cambios: `lint → build`
