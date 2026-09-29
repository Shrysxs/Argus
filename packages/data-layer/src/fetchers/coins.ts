import { DataFetchError } from "../errors";
import { TtlCache } from "../cache";

export interface CoinInfo {
  id: string;
  symbol: string; // Uppercase, e.g. "DOGE"
  name: string;   // e.g. "Dogecoin"
}

// Curated top 100+ crypto assets by market cap (fallback baseline)
export const STATIC_COINS_LIST: CoinInfo[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "tether", symbol: "USDT", name: "Tether" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "usd-coin", symbol: "USDC", name: "USDC" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
  { id: "the-open-network", symbol: "TON", name: "Toncoin" },
  { id: "sui", symbol: "SUI", name: "Sui" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "pepe", symbol: "PEPE", name: "Pepe" },
  { id: "aptos", symbol: "APT", name: "Aptos" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer" },
  { id: "render-token", symbol: "RENDER", name: "Render" },
  { id: "hedera-hashgraph", symbol: "HBAR", name: "Hedera" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor" },
  { id: "fetch-ai", symbol: "FET", name: "Artificial Superintelligence Alliance" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum" },
  { id: "optimism", symbol: "OP", name: "Optimism" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos" },
  { id: "filecoin", symbol: "FIL", name: "Filecoin" },
  { id: "kaspa", symbol: "KAS", name: "Kaspa" },
  { id: "blockstack", symbol: "STX", name: "Stacks" },
  { id: "lido-dao", symbol: "LDO", name: "Lido DAO" },
  { id: "celestia", symbol: "TIA", name: "Celestia" },
  { id: "immutable-x", symbol: "IMX", name: "Immutable" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective" },
  { id: "aave", symbol: "AAVE", name: "Aave" },
  { id: "maker", symbol: "MKR", name: "Maker" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon (MATIC)" },
  { id: "sei-network", symbol: "SEI", name: "Sei" },
  { id: "dogwifcoin", symbol: "WIF", name: "dogwifhat" },
  { id: "bonk", symbol: "BONK", name: "Bonk" },
  { id: "floki", symbol: "FLOKI", name: "Floki" },
  { id: "fantom", symbol: "FTM", name: "Fantom" },
  { id: "algorand", symbol: "ALGO", name: "Algorand" },
  { id: "jasmy", symbol: "JASMY", name: "JasmyCoin" },
  { id: "theta-token", symbol: "THETA", name: "Theta Network" },
  { id: "the-graph", symbol: "GRT", name: "The Graph" },
  { id: "thorchain", symbol: "RUNE", name: "THORChain" },
  { id: "the-sandbox", symbol: "SAND", name: "The Sandbox" },
  { id: "decentraland", symbol: "MANA", name: "Decentraland" },
  { id: "gala", symbol: "GALA", name: "Gala" },
  { id: "eos", symbol: "EOS", name: "EOS" },
  { id: "bitcoin-cash-sv", symbol: "BSV", name: "Bitcoin SV" },
  { id: "neo", symbol: "NEO", name: "NEO" },
  { id: "monero", symbol: "XMR", name: "Monero" },
  { id: "elrond-erd-2", symbol: "EGLD", name: "MultiversX" },
  { id: "flow", symbol: "FLOW", name: "Flow" },
  { id: "axie-infinity", symbol: "AXS", name: "Axie Infinity" },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz" },
  { id: "mina-protocol", symbol: "MINA", name: "Mina" },
  { id: "quant-network", symbol: "QNT", name: "Quant" },
  { id: "dydx-chain", symbol: "DYDX", name: "dYdX" },
  { id: "curve-dao-token", symbol: "CRV", name: "Curve DAO Token" },
  { id: "havven", symbol: "SNX", name: "Synthetix" },
  { id: "ethereum-name-service", symbol: "ENS", name: "Ethereum Name Service" },
  { id: "compound-governance-token", symbol: "COMP", name: "Compound" },
  { id: "1inch", symbol: "1INCH", name: "1inch Network" },
  { id: "basic-attention-token", symbol: "BAT", name: "Basic Attention Token" },
  { id: "kava", symbol: "KAVA", name: "Kava" },
  { id: "zcash", symbol: "ZEC", name: "Zcash" },
  { id: "dash", symbol: "DASH", name: "Dash" },
  { id: "tezos", symbol: "XTZ", name: "Tezos" },
  { id: "iota", symbol: "IOTA", name: "IOTA" },
  { id: "worldcoin-wld", symbol: "WLD", name: "Worldcoin" },
  { id: "ordi", symbol: "ORDI", name: "ORDI" },
  { id: "pyth-network", symbol: "PYTH", name: "Pyth Network" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter" },
  { id: "starknet", symbol: "STRK", name: "Starknet" },
  { id: "ethena", symbol: "ENA", name: "Ethena" },
  { id: "notcoin", symbol: "NOT", name: "Notcoin" },
  { id: "ondo-finance", symbol: "ONDO", name: "Ondo" },
  { id: "pendle", symbol: "PENDLE", name: "Pendle" },
  { id: "arweave", symbol: "AR", name: "Arweave" },
  { id: "blur", symbol: "BLUR", name: "Blur" },
  { id: "memecoin", symbol: "MEME", name: "Memecoin" },
  { id: "book-of-meme", symbol: "BOME", name: "BOOK OF MEME" },
  { id: "popcat", symbol: "POPCAT", name: "Popcat" },
  { id: "turbo", symbol: "TURBO", name: "Turbo" },
  { id: "cat-in-a-dogs-world", symbol: "MEW", name: "cat in a dogs world" },
  { id: "brett", symbol: "BRETT", name: "Brett" },
  { id: "mog-coin", symbol: "MOG", name: "Mog Coin" },
  { id: "neiro-3", symbol: "NEIRO", name: "Neiro" },
  { id: "goatseus-maximus", symbol: "GOAT", name: "Goatseus Maximus" },
  { id: "moo-deng", symbol: "MOODENG", name: "Moo Deng" },
  { id: "vechain", symbol: "VET", name: "VeChain" },
  { id: "theta-fuel", symbol: "TFUEL", name: "Theta Fuel" },
];

const COINGECKO_LIST_URL = "https://api.coingecko.com/api/v3/coins/list";
const LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours aggressive cache

const universeCache = new TtlCache<CoinInfo[]>(LIST_CACHE_TTL_MS);
const UNIVERSE_CACHE_KEY = "coingecko_coins_universe";

export function clearUniverseCache(): void {
  universeCache.delete(UNIVERSE_CACHE_KEY);
}

export async function getCoinUniverse(
  fetchFn: typeof fetch = fetch
): Promise<CoinInfo[]> {
  const cached = universeCache.get(UNIVERSE_CACHE_KEY);
  if (cached) return cached;

  try {
    const res = await fetchFn(COINGECKO_LIST_URL);
    if (res.ok) {
      const rawList = (await res.json()) as Array<{
        id?: string;
        symbol?: string;
        name?: string;
      }>;

      if (Array.isArray(rawList) && rawList.length > 0) {
        // Map raw items to CoinInfo
        const fetchedMap = new Map<string, CoinInfo>();
        for (const item of rawList) {
          if (item.id && item.symbol && item.name) {
            fetchedMap.set(item.id.toLowerCase(), {
              id: item.id.toLowerCase(),
              symbol: item.symbol.toUpperCase(),
              name: item.name,
            });
          }
        }

        // Start with static list (maintains high quality market-cap order for top assets)
        const merged: CoinInfo[] = [...STATIC_COINS_LIST];
        const knownIds = new Set(merged.map((c) => c.id.toLowerCase()));

        // Add remaining fetched coins
        for (const [id, coin] of fetchedMap.entries()) {
          if (!knownIds.has(id)) {
            merged.push(coin);
            knownIds.add(id);
          }
        }

        universeCache.set(UNIVERSE_CACHE_KEY, merged);
        return merged;
      }
    }
  } catch {
    // If network or rate limit fails, fall back gracefully to static list
  }

  // Fallback to static top assets list
  universeCache.set(UNIVERSE_CACHE_KEY, STATIC_COINS_LIST);
  return STATIC_COINS_LIST;
}

/**
 * Resolves an input ticker symbol (e.g. "DOGE") or CoinGecko ID (e.g. "dogecoin")
 * to a verified CoinGecko coin ID.
 * Throws DataFetchError if asset is not found in universe (does NOT guess slugs).
 */
export function resolveCoinId(
  input: string,
  universe: CoinInfo[] = STATIC_COINS_LIST
): string {
  const clean = input.trim().toLowerCase();
  if (!clean) {
    throw new DataFetchError(
      "coingecko",
      "empty asset ticker or coin id provided"
    );
  }

  // 1. Direct match on symbol (case-insensitive)
  const symbolMatch = universe.find((c) => c.symbol.toLowerCase() === clean);
  if (symbolMatch) {
    return symbolMatch.id;
  }

  // 2. Direct match on coin ID
  const idMatch = universe.find((c) => c.id.toLowerCase() === clean);
  if (idMatch) {
    return idMatch.id;
  }

  // If not found in universe, fail loud as required by DATA.md & requirement 1
  throw new DataFetchError(
    "coingecko",
    `unsupported asset ticker or coin id "${input}" — check the asset symbol or id is valid`
  );
}
