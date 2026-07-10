const tickerItems = [
  { label: "S&P 500", value: "5,892.41", change: "+0.82%", up: true },
  { label: "NASDAQ", value: "18,567.23", change: "+1.14%", up: true },
  { label: "IBEX 35", value: "11,234.50", change: "-0.31%", up: false },
  { label: "BTC/USD", value: "67,342.80", change: "+2.45%", up: true },
  { label: "ETH/USD", value: "3,456.21", change: "-1.12%", up: false },
  { label: "EUR/USD", value: "1.0842", change: "+0.15%", up: true },
  { label: "GBP/JPY", value: "192.45", change: "-0.08%", up: false },
  { label: "Crude Oil", value: "78.32", change: "+0.54%", up: true },
  { label: "Gold", value: "2,341.60", change: "+0.23%", up: true },
];

export function MarketTicker() {
  const content = (
    <div className="flex items-center gap-8">
      {tickerItems.map((item) => (
        <div key={item.label} className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">{item.label}</span>
          <span className="font-mono text-sm text-text-primary">{item.value}</span>
          <span className={`font-mono text-xs ${item.up ? "text-green" : "text-red"}`}>
            {item.change}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-b border-border bg-bg-card/50">
      <div className="flex animate-ticker py-2">
        {content}
        {content}
      </div>
    </div>
  );
}
