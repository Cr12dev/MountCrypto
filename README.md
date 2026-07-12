# MountCrypto

Financial markets dashboard for stocks, crypto, forex, and commodities. Real-time data, customizable watchlists, portfolio tracking, and price alerts.

Built with Next.js 15, Supabase, Yahoo Finance, and CoinGecko.

## Features

- **Market overview** — indices, top movers, sector breadth in a bento-grid layout
- **Stocks, crypto, forex, commodities** — dedicated pages with sortable tables and multi-timeframe changes (1h, 5h, 1d, 7d, 28d, 1y, 5y)
- **Asset detail** — interactive candlestick chart (custom Canvas OHLC), key stats, news
- **Watchlists** — create, reorder, and share publicly via token
- **Portfolio** — track holdings, P&L, transactions, share publicly
- **Price alerts** — threshold-based alerts with status management
- **News** — Yahoo Finance news + scraped articles (BBC, NYT, Bild, The Economist)
- **Global search** — search across markets
- **Real-time polling** — 10-second updates on all market tables
- **Authentication** — email/password + OAuth via Supabase

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS v4 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email + OAuth) |
| Market data | Yahoo Finance (`yahoo-finance2`), CoinGecko |
| Charts | Recharts (sparklines), custom Canvas OHLC |
| News scraping | FastAPI + Playwright (BBC, NYT, Bild, Economist) |
| Deployment | Vercel (web), Railway (scraping API) |

## Getting started

```bash
npm install
cp .env.local.example .env.local
```

Fill in your Supabase project credentials in `.env.local`, then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### News scraping API (optional)

```bash
cd scraping
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --host 0.0.0.0 --port 8000
```

Set `SCRAPING_API_URL=http://localhost:8000` in `.env.local`.

## Project structure

```
app/           → App Router pages and API routes
components/    → React components (grouped by feature)
lib/           → Utils, API clients, Supabase clients
lib/supabase/  → Supabase client factories (server, browser)
scraping/      → FastAPI news scraping service
knowledge/     → Obsidian vault (plans, notes, reviews)
```

## Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feat/my-feature`.
3. Make your changes and run `npm run lint` to verify.
4. Commit with a descriptive message.
5. Open a pull request to `main`.

All contributions are welcome — bug fixes, new features, documentation improvements.

## License

Copyright © 2026 MountCrypto.

All Rights Reserved. This codebase is provided for **non-commercial use only**. You may view, fork, and modify the code for personal or educational purposes. Commercial use, including but not limited to selling, hosting as a service, or using in a commercial product, is strictly prohibited without explicit written permission from the author.
