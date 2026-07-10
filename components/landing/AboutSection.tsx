const features = [
  {
    title: "Live market data",
    desc: "Real-time prices for stocks, crypto, forex, and commodities from institutional-grade feeds. Sub-millisecond updates keep you ahead of every move.",
  },
  {
    title: "Unified dashboard",
    desc: "Track every asset class in one place. No more switching between Bloomberg terminals, exchange UIs, and your brokerage — it's all here.",
  },
  {
    title: "Portfolio intelligence",
    desc: "Connect your holdings across wallets and brokers. See realized and unrealized P&L, allocation heatmaps, and daily performance at a glance.",
  },
  {
    title: "Smart watchlists",
    desc: "Build custom watchlists with conditional alerts. Get notified by email or in-app when an asset breaks your price threshold or volume spike.",
  },
  {
    title: "Advanced charts",
    desc: "Interactive candlestick charts with 30+ technical indicators. Overlay moving averages, Bollinger bands, RSI, and MACD on any timeframe.",
  },
  {
    title: "REST API access",
    desc: "Pull market data and portfolio metrics into your own tools. WebSocket streaming available for real-time feeds. Documented endpoints with SDK examples.",
  },
];

export function AboutSection() {
  return (
    <section id="about" data-gsap="section-reveal" className="border-b border-border/20 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <p data-gsap="label" className="text-xs font-medium tracking-[0.15em] text-text-secondary">About</p>
        <h2 data-gsap="title" className="mt-3 font-display text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-tight tracking-[-0.02em] text-text-primary">
          Built for traders who need every edge.
        </h2>
        <div data-gsap="card-stagger" className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col bg-bg-primary p-6 md:p-8">
              <p className="text-xs font-semibold text-text-primary">{f.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
