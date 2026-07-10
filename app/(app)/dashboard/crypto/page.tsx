import { fetchCoinMarkets } from "@/lib/api/coingecko";
import { CryptoTable } from "@/components/crypto/CryptoTable";

export default async function CryptoPage() {
  const coins = await fetchCoinMarkets(1, 100);

  return <CryptoTable coins={coins} />;
}
