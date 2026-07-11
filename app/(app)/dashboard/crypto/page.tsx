import { fetchCoinMarkets } from "@/lib/api/coingecko";
import { CryptoTable } from "@/components/crypto/CryptoTable";

export const dynamic = "force-dynamic";

export default async function CryptoPage() {
  let coins: Awaited<ReturnType<typeof fetchCoinMarkets>> = [];
  try {
    coins = await fetchCoinMarkets(1, 100);
  } catch {}

  return <CryptoTable coins={coins} />;
}
