# Security Audit: MountCrypto Full Application

**Date**: 2026-07-11
**Scope**: Auth flows, API routes, server actions, RLS policies, XSS vectors, secrets exposure, SSRF, dependency vulnerabilities, Supabase configuration

## Methodology
- Source code review of all API routes, server actions, middleware, and Supabase clients
- Supabase RLS policy verification via `pg_policies` query
- Supabase security advisors (`supabase_get_advisors`)
- Dependency audit (`npm audit` pre-known)
- Git configuration review (.gitignore, .env.local)
- OWASP Top 10 mapping

## Findings

### 🔴 Critical — Missing auth verification in `reorderAsset` server action
- **File**: `lib/actions/watchlist.ts:82-91`
- **Risk**: The `reorderAsset` function has **no auth guard at all** — it doesn't call `getUser()`, doesn't verify authentication, and doesn't filter by `user_id`. Any unauthenticated or authenticated user can reorder assets in any watchlist by its ID. Currently saved by RLS — there is **no UPDATE policy** on `watchlist_assets` (missing), so all UPDATE attempts are denied by RLS. However, if a future migration adds a permissive UPDATE policy, this becomes a direct data corruption vector.
- **Fix**: Add `getUser()` check and filter by `user_id` through a subquery on the watchlist table: `.eq("watchlist_id.user_id", user.id)` or use a WHERE EXISTS subquery.

### 🔴 Critical — Missing `user_id` filter on `removeAsset` (defense-in-depth bypass)
- **File**: `lib/actions/watchlist.ts:68-80`
- **Risk**: Deletes a `watchlist_assets` row by `id` only — no `.eq("user_id", user.id)` verification. RLS currently protects this via a subquery policy (`EXISTS SELECT 1 FROM watchlists WHERE id = watchlist_id AND user_id = auth.uid()`), but if the RLS policy is ever relaxed, any authenticated user can delete any watchlist asset.
- **Fix**: Add `getUser()` auth check and filter by user ownership, or rely on but verify RLS subquery.

### 🔴 Critical — Missing `user_id` filter on `deleteTransaction` (defense-in-depth, also broken)
- **File**: `lib/actions/portfolio.ts:68-80`
- **Risk**: Deletes `portfolio_transactions` by `id` only. No `user_id` filter, no holding ownership verification. There is **no DELETE policy** on `portfolio_transactions` at all, so RLS blocks all deletes — making this function **completely broken** (always throws error). If a DELETE policy is added without a proper ownership check, any authenticated user could delete any transaction.
- **Fix**: Add `.eq("user_id", user.id)` via a subquery join to `portfolio_holdings`, OR create a proper RLS DELETE policy with the subquery ownership check.

### 🔴 Critical — Missing UPDATE and DELETE RLS policies on `portfolio_transactions`
- **File**: `public.portfolio_transactions` (Supabase RLS)
- **Risk**: The table has RLS enabled with SELECT and INSERT policies, but NO UPDATE and NO DELETE policies. This means:
  - `deleteTransaction()` always fails (RLS denies)
  - No UPDATE operations are possible via the API
  - This is inconsistent with the server actions that attempt DELETE operations
- **Fix**: Add RLS policies:
  ```sql
  CREATE POLICY "Users can delete own transactions" ON portfolio_transactions
    FOR DELETE USING (
      EXISTS (SELECT 1 FROM portfolio_holdings WHERE id = holding_id AND user_id = auth.uid())
    );
  ```
  And consider an UPDATE policy if needed.

### 🔴 Critical — Missing UPDATE RLS policy on `watchlist_assets`
- **File**: `public.watchlist_assets` (Supabase RLS)
- **Risk**: The table has SELECT, INSERT, and DELETE policies, but NO UPDATE policy. This means `reorderAsset()` (which calls `.update({ position })`) always fails due to RLS. If an UPDATE policy is added without an ownership subquery, it becomes exploitable.
- **Fix**: Add an UPDATE RLS policy:
  ```sql
  CREATE POLICY "Users can update own watchlist assets" ON watchlist_assets
    FOR UPDATE USING (
      EXISTS (SELECT 1 FROM watchlists WHERE id = watchlist_id AND user_id = auth.uid())
    );
  ```

### 🔴 Critical — XSS via `dangerouslySetInnerHTML` on asset detail page
- **File**: `app/assets/[symbol]/page.tsx:94`
- **Risk**: CoinGecko's `description.en` is rendered directly as HTML via `dangerouslySetInnerHTML`. While CoinGecko is a trusted first-party source, if:
  - CoinGecko's API is compromised
  - A crypto project injects malicious HTML/JS into their CoinGecko description
  - The description contains `<script>`, event handlers, or phishing links
  Then users viewing that asset page would execute arbitrary JavaScript in their browser context. The description is truncated to 5 sentences, but that still allows `<img onerror>`, `<script>`, `<a href="javascript:...">`, etc.
- **Fix**: Sanitize the HTML before rendering using DOMPurify (`isomorphic-dompurify`), or render as plain text with `textContent` instead:
  ```tsx
  import DOMPurify from "isomorphic-dompurify";
  // ...
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(coin.description.en) }}
  ```
  Or strip HTML entirely and use `{stripHtml(coin.description.en)}`.

### 🔴 Critical — Exposed internal scraping API via `NEXT_PUBLIC_SCRAPING_API_URL`
- **File**: `app/(app)/news/page.tsx:18`
- **Risk**: The scraping API URL is exposed with `NEXT_PUBLIC_` prefix, making it visible in the client-side JavaScript bundle. The client component directly fetches from this URL (`${SCRAPING_API}/scrape?sources=...`), bypassing the server-side proxy at `app/api/news/scraped/route.ts`. This means:
  - Anyone can discover the scraping API endpoint
  - Rate limiting, IP allowlisting, or auth on the scraping service is bypassed
  - All scraping API features are exposed to arbitrary callers
  - The request has a 55-second timeout from client side, which is excessive
- **Fix**: Remove `NEXT_PUBLIC_SCRAPING_API_URL` and route all scraping requests through the server-side proxy at `/api/news/scraped`. The client should only call `/api/news/scraped` — the server-side route already has the API URL as a server-only env variable.

### 🟡 Warning — `createHolding` inserts without validating `assetType` against allowed values
- **File**: `lib/actions/portfolio.ts:6-20`
- **Risk**: The `assetType` parameter is inserted directly into the database. While there's a CHECK constraint on `asset_type` column (`asset_type = ANY (ARRAY['stock', 'crypto', 'forex', 'commodity'])`), the server action doesn't validate client input before sending to Supabase. A user could attempt invalid values; they'd be rejected by the DB, but the error message would confirm the valid types.
- **Fix**: Add server-side validation of `assetType` against the allowed enum values before inserting.

### 🟡 Warning — `addTransaction` doesn't verify holding ownership at application level
- **File**: `lib/actions/portfolio.ts:52-66`
- **Risk**: The function fetches `user` via `getUser()` but doesn't verify that the `holdingId` belongs to that user. RLS protects via the INSERT policy's subquery check (`EXISTS SELECT 1 FROM portfolio_holdings WHERE id = holding_id AND user_id = auth.uid()`), but there's no application-layer check. Defense-in-depth violation.
- **Fix**: Query the holding first to verify ownership, or trust RLS but add a clarifying comment.

### 🟡 Warning — Supabase `rls_auto_enable` function executable by `anon` role
- **File**: `public.rls_auto_enable` (Supabase function, SECURITY DEFINER)
- **Risk**: A SECURITY DEFINER function is executable by the `anon` (unauthenticated) role via `/rest/v1/rpc/rls_auto_enable`. While the function only enables RLS on new tables (benign), it's a privilege escalation risk — if the function were ever modified to do something more powerful, it could be exploited by unauthenticated users. Supabase flagged this as WARN.
- **Fix**: Revoke EXECUTE from `anon` and `authenticated`:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;
  ```

### 🟡 Warning — Leaked password protection disabled in Supabase Auth
- **File**: Supabase Auth configuration
- **Risk**: Supabase Auth's leaked password protection (checks against HaveIBeenPwned) is disabled. Users can register with passwords that have been compromised in data breaches, making account takeover easier.
- **Fix**: Enable in Supabase Dashboard: Auth → Settings → Security → Leaked password protection.

### 🟡 Warning — OAuth callback missing `state` parameter validation
- **File**: `app/auth/callback/route.ts:9-11`
- **Risk**: The callback only checks for the `code` parameter but does not validate the `state` parameter against the one stored when initiating the OAuth flow. While Supabase's PKCE flow mitigates CSRF attacks on the auth exchange itself, the `state` parameter is still recommended for CSRF protection and to prevent malicious deep-linking.
- **Fix**: Validate `state` against the cookie value set during sign-in initiation. However, for the current email/password + PKCE flow, this is lower risk. Add if OAuth providers are added later.

### 🟡 Warning — Client-side scraping timeout of 55 seconds
- **File**: `app/(app)/news/page.tsx:60`
- **Risk**: The `AbortSignal.timeout(55000)` creates a 55-second client-side fetch timeout. Browser fetch timeouts this long can tie up browser resources, and users may perceive the page as hung. Combined with the exposed API URL, this could be abused.
- **Fix**: Reduce timeout to 10-15 seconds, or better, proxy through the server-side API route.

### 🔵 Info — Middleware `config.matcher` matches all routes, causing unnecessary `getUser()` calls
- **File**: `middleware.ts:42-43`
- **Risk**: The matcher `/((?!_next/static|_next/image|favicon.ico).*)` matches every request including API routes, CSS, JS, and image files. The `getUser()` call in middleware sends a verification request to Supabase Auth on every asset load — this adds latency and auth server load for non-routable resources.
- **Fix**: Restrict the matcher to only protected routes or negate the matcher for asset-heavy paths:
  ```ts
  matcher: ["/dashboard/:path*", "/watchlist/:path*", "/portfolio/:path*", "/settings/:path*", "/news/:path*", "/alerts/:path*"]
  ```

### 🔵 Info — No Content Security Policy (CSP) headers configured
- **File**: `next.config.mjs`
- **Risk**: No CSP headers are set, which means the app lacks defense-in-depth against XSS attacks. If an XSS vulnerability is found (e.g., the `dangerouslySetInnerHTML` issue), CSP could prevent exploitation.
- **Fix**: Add CSP headers in `next.config.mjs`:
  ```js
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://assets.coingecko.com https://coin-images.coingecko.com https://s.yimg.com https://media.zenfs.com https://l.yimg.com https://ichef.bbci.co.uk ..." }
        ]
      }
    ]
  }
  ```

### 🔵 Info — API routes have no rate limiting
- **Files**: All files in `app/api/`
- **Risk**: None of the API routes implement rate limiting or throttling. While these proxy to external APIs with their own rate limits, there's no protection against a user repeatedly hitting the same endpoint and consuming external API quota or causing backend costs.
- **Fix**: Add rate limiting middleware using Vercel KV, Upstash, or a simple in-memory rate limiter. Consider at least per-IP rate limiting on endpoints that proxy to external APIs with costs.

### 🔵 Info — `yahoo-finance2` types used with `as any` casts
- **File**: `lib/api/news.ts:25`, `lib/api/yahoo.ts` (multiple locations)
- **Risk**: Multiple `as any` type casts on the `yahoo-finance2` search result. This bypasses TypeScript type checking and could mask breaking changes when the library updates. Not a direct security vulnerability but reduces code quality and could hide runtime errors.
- **Fix**: Use the proper types from `yahoo-finance2` or create typed wrapper functions.

### 🔵 Info — No SQL injection vector found
- **All files reviewed**: No raw SQL queries with user input concatenation. All database operations use the Supabase JS client (parameterized queries) via `.from()`, `.insert()`, `.update()`, `.delete()`, `.eq()` — safe by construction.
- **Status**: ✅ No SQL injection risk.

### 🔵 Info — SSRF analysis: no exploitable SSRF vectors
- **Files reviewed**: `app/api/ohlc/route.ts`, `app/api/crypto/[coinId]/route.ts`, `app/api/news/scraped/route.ts`
- **Risk**: All external URL fetches use either:
  - Hardcoded base URLs from constants (CoinGecko: `https://api.coingecko.com/api/v3` — safe)
  - Env-configured URLs (scraping API: `SCRAPING_API_URL` — safe)
  - Library calls (`yahoo-finance2` — library handles URL construction internally — safe)
  - The OHLC route's fallback `symbol + "=X"` is passed to `yahooFinance.chart()` which uses the Yahoo API, not a direct fetch — not exploitable for SSRF
- **Status**: ✅ No SSRF risk identified.

### 🔵 Info — PostCSS XSS in `npm audit` (moderate)
- **Dependency**: PostCSS (transitive via Next.js)
- **Risk**: Two moderate-severity vulnerabilities in PostCSS related to CSS injection via malformed `</style>` tags in CSS stringify. Exploitation requires attacker-controlled CSS content. In this project, there's no user-supplied CSS being processed, so the practical risk is low.
- **Fix**: Upgrade Next.js to the latest patch version in the 15.x line to pull in the patched PostCSS version.

## Summary

### Risk Score: **MODERATE-HIGH**

The application has **4 critical** issues that require immediate attention:

| Severity | Issue | Impact |
|----------|-------|--------|
| 🔴 | `reorderAsset` has no auth guard (missing `getUser()` + no `user_id` filter) | Any user could reorder assets; currently blocked by missing UPDATE RLS policy |
| 🔴 | `dangerouslySetInnerHTML` on CoinGecko description | XSS if CoinGecko description contains malicious HTML |
| 🔴 | `NEXT_PUBLIC_SCRAPING_API_URL` exposes internal API URL | External scraping API exposed; client-side bypass of server proxy |
| 🔴 | Missing DELETE/UPDATE RLS policies on `portfolio_transactions` and `watchlist_assets` | Server actions broken; if policies are added without checks, data can be tampered |
| 🟡 | `removeAsset` and `deleteTransaction` missing `user_id` filters | Defense-in-depth gaps; RLS currently protects but fragile |
| 🟡 | Leaked password protection disabled | Users can register with compromised passwords |
| 🟡 | `rls_auto_enable` executable by `anon` | Unnecessary privilege exposure |

### Top 5 fixes prioritized:

1. **Fix auth guard in `reorderAsset`** — add `getUser()` and `user_id` check (most critical because it has zero auth)
2. **Sanitize `dangerouslySetInnerHTML`** — use DOMPurify or render as text (real XSS risk)
3. **Remove `NEXT_PUBLIC_SCRAPING_API_URL`** — proxy all scraping through server API route (exposed internal service)
4. **Add missing RLS policies** for DELETE on `portfolio_transactions` and UPDATE on `watchlist_assets` (defense-in-depth + fix broken server actions)
5. **Add `user_id` filters** to `removeAsset` and `deleteTransaction` server actions

### Attack surface overview
- **Auth layer**: Middleware correctly uses `getUser()` (not `getSession()`). SSR pattern is correct. Callback lacks `state` validation (low risk for PKCE). ✅ Core auth is solid.
- **API layer**: No SSRF, no SQL injection. Missing rate limiting. ✅ Low risk.
- **Server actions**: 3 functions with missing/insufficient auth checks. 🔴 Highest risk area.
- **XSS**: 1 confirmed high-risk (dangerouslySetInnerHTML), 1 low-risk (innerHTML with numeric data).
- **Secrets**: `.env.local` properly gitignored ✅. No API keys in client bundle except Supabase anon key (public by design). `NEXT_PUBLIC_SCRAPING_API_URL` is the only concerning exposure.
- **RLS**: All 6 tables have RLS enabled ✅. Some policies are missing (UPDATE/DELETE on 2 tables).

### Recent related notes
- [[Review 2026-07-11 Dashboard Performance]]

