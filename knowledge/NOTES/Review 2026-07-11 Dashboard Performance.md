# Review: Dashboard Performance

**Date**: 2026-07-11
**Scope**: Dashboard pages, BentoOverview, CandlestickChart, NewsRightSidebar, Navbar, MarketTicker, Yahoo Finance API, CoinGecko API, layout, API routes, NewsContext

## Findings

### 🔴: N+1 Yahoo Finance API calls cause massive dashboard load (37+ sequential requests)
- **File**: lib/api/yahoo.ts:166-287
- **Issue**: etchIndexQuotes, etchStockQuotes, etchForexQuotes, and etchCommodityQuotes each call yahooFinance.quote() once then call etchChanges() (which calls yahooFinance.chart() with 5 years of data) **per symbol**. For the dashboard load: 1x quote + 6x chart (indices) + 1x quote + 10x chart (stocks) + 1x quote + 8x chart (forex) + 1x quote + 8x chart (commodities) = **~37 Yahoo Finance API calls**. Each chart() fetches 5+ years of daily data just to compute % changes.
- **Suggestion**: Batch etchChanges into a single chart() call per symbol list, or use a cached/aggregated endpoint. Cache change computations in-memory or use Supabase as a cache layer. Consider pre-computing changes from the last 
 daily closes using a single chart call with enough history.

### 🔴: CandlestickChart re-creates draw callback on every mouse move -- constant effect churn
- **File**: components/charts/CandlestickChart.tsx:40-210
- **Issue**: The draw callback is wrapped in useCallback with dependency crosshair. Every mouseMove -> setCrosshair -> re-render -> draw identity changes -> useEffect cleanup/setup cycle on every mouse move (add + remove resize listener each time). This also defeats canvas drawing optimization since resize listener is re-registered constantly.
- **Suggestion**: Split crosshair drawing out of the main draw function. Use a useRef for the crosshair position and draw it in a separate overlay canvas or in a equestAnimationFrame loop that reads from the ref. Keep the main draw dependent only on [data, visibleStart, visibleCount].

### 🔴: Missing AbortController on OHLC fetch -- sets state on unmounted component
- **File**: components/dashboard/BentoOverview.tsx:76-90
- **Issue**: The etchOhlc function does not accept or use an AbortController. If the component unmounts (e.g., user navigates away) while a fetch is in-flight, the .then() callback runs setChartData() on an unmounted component, causing a React memory leak warning.
- **Suggestion**: Accept an AbortSignal parameter in etchOhlc and pass it to the fetch call. Track the abort controller in a ref and abort on cleanup.

### 🔴: Silent catch swallows all data-fetch errors
- **File**: components/dashboard/BentoOverview.tsx:71
- **Issue**: The main data fetch Promise.all(...).catch(() => {}) has an empty catch block. Any network or parse error is silently swallowed. The component shows empty arrays and isEmpty becomes true, but the user sees "Loading market data..." forever or gets no error feedback beyond the 8-second timeout message.
- **Suggestion**: At minimum console.error in the catch. Consider per-endpoint error state to show partial data.

### 🟡: Missing useMemo for computed values on every render
- **File**: components/dashboard/BentoOverview.tsx:92-94
- **Issue**: 	opMovers, readthGreen, and readthRed are computed from stocks on **every render** (including when unrelated state changes like chartAsset, chartDays, coins, etc.). 	opMovers also spreads and sorts the entire stocks array.
- **Suggestion**: Wrap in useMemo:
  `
  const topMovers = useMemo(() => [...stocks].sort(...), [stocks]);
  const breadthGreen = useMemo(() => stocks.filter(s => s.changePercent >= 0).length, [stocks]);
  const breadthRed = useMemo(() => stocks.filter(s => s.changePercent < 0).length, [stocks]);
  `

### 🟡: CandlestickChart missing requestAnimationFrame throttle on mousemove
- **File**: components/charts/CandlestickChart.tsx:219-223
- **Issue**: onMouseMove calls setCrosshair on every single mouse event (potentially 60+ times/sec). Each state change triggers a React re-render and redraw of the entire canvas.
- **Suggestion**: Throttle with equestAnimationFrame using a ref-based approach that reads from the ref in the draw function instead of React state.

### 🟡: etchChanges fetches 5+ years of daily data just for a few change percentages
- **File**: lib/api/yahoo.ts:122-164
- **Issue**: The etchChanges function fetches 365*5+60 days of daily chart data for every single symbol just to calculate 1d/7d/28d/1y/5y percentage changes. This is ~1890 daily data points per symbol. With 32 symbols, that's ~60k daily bars downloaded on every dashboard load.
- **Suggestion**: Reduce period1 to the minimum required. Cache chart results across symbols that share the same interval.

### 🟡: NewsRightSidebar missing AbortController
- **File**: components/news/NewsRightSidebar.tsx:28-34
- **Issue**: etch("/api/news") has no AbortController. If the user rapidly toggles the news panel, multiple fetches may be in-flight and older responses can overwrite newer ones or set state after unmount.
- **Suggestion**: Add an AbortController in a ref, abort any in-flight request when isNewsOpen changes to false or component unmounts.

### 🟡: Navbar creates new Supabase client on every mount and doesn't clean up
- **File**: components/layout/Navbar.tsx:14-19
- **Issue**: createClient() is called every mount inside useEffect. The effect has no cleanup function, so if the component unmounts quickly, the resolved promise tries setEmail on an unmounted component.
- **Suggestion**: Create the client once outside the effect or in a ref. Add an ignore flag or AbortController for cleanup.

### 🟡: CandlestickChart uses innerHTML for tooltip content
- **File**: components/charts/CandlestickChart.tsx:186-196
- **Issue**: The tooltip content is set via 	ooltip!.innerHTML = instead of using React rendering. This bypasses React's reconciliation, mixes imperative and declarative patterns, and could be an XSS vector.
- **Suggestion**: Use a React state for tooltip data (visible, content, position) and render it declaratively alongside the canvas.

### 🟡: Large bundle -- yahoo-finance2 imported server-side but instantiated eagerly
- **File**: lib/api/yahoo.ts:1,4
- **Issue**: import YahooFinance from "yahoo-finance2" and 
ew YahooFinance() run at module import time. If any serverless function cold-starts, it pays the full cost of initializing this large library.
- **Suggestion**: Lazy-instantiate yahooFinance inside each function, or use a lazy getter pattern.

### 🟡: BentoOverview is a monolithic client component violating AGENTS.md architecture
- **File**: components/dashboard/BentoOverview.tsx:1
- **Issue**: AGENTS.md specifies "Server Components for initial data fetch, Client Components only for interactivity." But BentoOverview is "use client" and fetches ALL data via client-side etch() to API routes. This means no SSR for initial data, a visible loading flash, and no server-side caching for the Yahoo Finance results.
- **Suggestion**: Move the initial data fetching to the server component (pp/(app)/dashboard/page.tsx), pass data as props to a lighter client component. Only keep interactive parts (chart, toggles) as client components.

### 🔵: 	imeAgo function re-executes on every render in NewsRightSidebar
- **File**: components/news/NewsRightSidebar.tsx:8-18,89
- **Issue**: 	imeAgo(article.providerPublishTime) is called for each article on every render. With 8 articles, that's 8 Date constructions and math operations per render.
- **Suggestion**: Memoize with useMemo per article, or accept it's negligible.

### 🔵: ChartData is not cached client-side -- re-fetches on every asset switch
- **File**: components/dashboard/BentoOverview.tsx:54-74,76-86
- **Issue**: Switching between chart assets (e.g., BTC -> ETH -> back to BTC) re-fetches data even if it was already loaded.
- **Suggestion**: Use a Map<string, OhlcBar[]> ref to cache fetched OHLC data keyed by symbol + days. Check cache before fetching.

### 🔵: Missing next/image configuration for CoinGecko images
- **File**: components/dashboard/BentoOverview.tsx:201
- **Issue**: CoinGecko images are loaded from external domains (e.g., ssets.coingecko.com). If 
ext.config.js does not have emotePatterns for this domain, Next.js will fail to serve the images or log warnings.
- **Suggestion**: Verify 
ext.config.js has a emotePatterns entry for ssets.coingecko.com.

### 🔵: MarketTicker data is hardcoded -- not fetched from live API
- **File**: components/layout/MarketTicker.tsx:1-11
- **Issue**: The market ticker shows static/hardcoded values. These will always be stale.
- **Suggestion**: Fetch from the same indices/stocks/crypto API routes for live data.

### 🔵: BottomPanel news is also hardcoded
- **File**: components/layout/BottomPanel.tsx:8-14
- **Issue**: The news items in the bottom panel are hardcoded strings, never refreshed.
- **Suggestion**: Either fetch from /api/news or remove if intentionally a placeholder.

### 🔵: TypeScript s any and s unknown as casts bypass type safety
- **File**: Multiple locations: lib/api/yahoo.ts:130, lib/api/yahoo.ts:171-177, lib/api/news.ts:25,31-32
- **Issue**: The Yahoo Finance library is untyped at key boundaries. All responses are cast with s unknown as { quotes: ChartQuote[] } or s any, meaning TypeScript provides no protection if the API shape changes.
- **Suggestion**: Write proper type guards or use Zod for runtime validation at the API boundary.

## Summary

**Top 5 issues to fix first:**

1. **🔴 N+1 Yahoo Finance calls** -- etchChanges per-symbol creates ~37 API calls per dashboard load. Batch chart queries, cache aggressively, or reduce history depth.
2. **🔴 CandlestickChart draw-cycle storm** -- draw callback re-created on every mouse move (via crosshair dependency), causing effect cleanup/setup spam. Split crosshair into a separate RAF-driven loop.
3. **🔴 Missing AbortControllers** -- OHLC fetch, news fetch, and Supabase auth in Navbar all risk setting state on unmounted components.
4. **🟡 Missing useMemo for computed data** -- 	opMovers (array sort) and breadth counters recompute on every unrelated state change in BentoOverview.
5. **🟡 Architecture mismatch** -- BentoOverview is a monolithic client component doing all data fetching, contrary to AGENTS.md guidance. Move initial data fetch to the server component.

Related: [[plan]], [[Supabase Integration]]
