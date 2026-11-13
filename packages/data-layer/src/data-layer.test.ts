import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { fetchPrice } from "./fetchers/price";
import { fetchPriceFallback } from "./fetchers/price-fallback";
import { fetchSentiment } from "./fetchers/sentiment";
import { fetchSentimentFallback } from "./fetchers/sentiment-fallback";
import { fetchOnchainMetrics } from "./fetchers/onchain-metrics";
import { resolveCoinId, getCoinUniverse, clearUniverseCache, STATIC_COINS_LIST } from "./fetchers/coins";
import { fetchSnapshot, snapshotCache, historyCache } from "./snapshot";
import { sha256 } from "./hash";
import { TtlCache } from "./cache";
import { fetchPriceAt } from "./fetchers/price-at";
import { DataFetchError, NotImplementedError } from "./errors";


// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown, status = 200): typeof fetch {
  return () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: () => Promise.resolve(body),
    } as Response);
}

function failingFetch(message = "network error"): typeof fetch {
  return () => Promise.reject(new Error(message));
}

const MOCK_PRICE_RESPONSE = {
  bitcoin: {
    usd: 65000,
    usd_market_cap: 1_280_000_000_000,
    usd_24h_vol: 28_000_000_000,
    usd_24h_change: 2.5,
  },
};

const MOCK_FNG_RESPONSE = {
  data: [{ value: "72", value_classification: "Greed" }],
};

// ---------------------------------------------------------------------------
// sha256 — canonical serialization
// ---------------------------------------------------------------------------

describe("sha256", () => {
  it("produces a stable 64-char hex string for the same input", () => {
    const h1 = sha256({ foo: "bar" });
    const h2 = sha256({ foo: "bar" });
    assert.equal(h1, h2);
    assert.equal(h1.length, 64);
    assert.match(h1, /^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different inputs", () => {
    assert.notEqual(sha256({ a: 1 }), sha256({ a: 2 }));
  });

  it("produces identical hashes regardless of key insertion order", () => {
    const h1 = sha256({ b: 2, a: 1, c: 3 });
    const h2 = sha256({ a: 1, c: 3, b: 2 });
    assert.equal(h1, h2);
  });

  it("canonicalizes nested objects recursively", () => {
    const h1 = sha256({ outer: { z: 1, a: 2 }, x: 0 });
    const h2 = sha256({ x: 0, outer: { a: 2, z: 1 } });
    assert.equal(h1, h2);
  });

  it("preserves array order (arrays are not sorted)", () => {
    const h1 = sha256({ arr: [1, 2, 3] });
    const h2 = sha256({ arr: [3, 2, 1] });
    assert.notEqual(h1, h2);
  });
});

// ---------------------------------------------------------------------------
// TtlCache
// ---------------------------------------------------------------------------

describe("TtlCache", () => {
  it("returns cached value within TTL", () => {
    const cache = new TtlCache<string>(5000);
    cache.set("k", "v");
    assert.equal(cache.get("k"), "v");
  });

  it("returns undefined after TTL expires", async () => {
    const cache = new TtlCache<string>(1);
    cache.set("k", "v");
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(cache.get("k"), undefined);
  });

  it("returns undefined for unknown keys", () => {
    const cache = new TtlCache<string>(5000);
    assert.equal(cache.get("missing"), undefined);
  });
});

// ---------------------------------------------------------------------------
// fetchPrice
// ---------------------------------------------------------------------------

describe("fetchPrice", () => {
  it("parses a valid CoinGecko response", async () => {
    const price = await fetchPrice("bitcoin", mockFetch(MOCK_PRICE_RESPONSE));
    assert.equal(price.asset, "bitcoin");
    assert.equal(price.priceUsd, 65000);
    assert.equal(price.priceChangePercent24h, 2.5);
    assert.ok(price.fetchedAt > 0);
  });

  it("throws DataFetchError on network failure", async () => {
    await assert.rejects(
      () => fetchPrice("bitcoin", failingFetch()),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.equal(err.source, "coingecko");
        assert.match(err.message, /network request failed/);
        return true;
      },
    );
  });

  it("throws DataFetchError on non-2xx response", async () => {
    await assert.rejects(
      () => fetchPrice("bitcoin", mockFetch({}, 429)),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.match(err.message, /429/);
        return true;
      },
    );
  });

  it("throws DataFetchError when coin id is not in response", async () => {
    await assert.rejects(
      () => fetchPrice("bitcoin", mockFetch({})),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.match(err.message, /no data returned/);
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// resolveCoinId & getCoinUniverse
// ---------------------------------------------------------------------------

describe("resolveCoinId & getCoinUniverse", () => {
  it("resolves classic assets (BTC, ETH, SOL)", () => {
    assert.equal(resolveCoinId("BTC"), "bitcoin");
    assert.equal(resolveCoinId("ETH"), "ethereum");
    assert.equal(resolveCoinId("SOL"), "solana");
  });

  it("resolves expanded crypto asset universe (DOGE, LINK, AVAX, SUI, ADA)", () => {
    assert.equal(resolveCoinId("DOGE"), "dogecoin");
    assert.equal(resolveCoinId("LINK"), "chainlink");
    assert.equal(resolveCoinId("AVAX"), "avalanche-2");
    assert.equal(resolveCoinId("SUI"), "sui");
    assert.equal(resolveCoinId("ADA"), "cardano");
  });

  it("resolves direct CoinGecko coin IDs", () => {
    assert.equal(resolveCoinId("dogecoin"), "dogecoin");
    assert.equal(resolveCoinId("chainlink"), "chainlink");
    assert.equal(resolveCoinId("avalanche-2"), "avalanche-2");
  });

  it("fails gracefully with DataFetchError for unsupported/invalid tickers (no silent slug guessing)", () => {
    assert.throws(
      () => resolveCoinId("INVALID_TICKER_999"),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.equal(err.source, "coingecko");
        assert.match(err.message, /unsupported asset ticker/);
        return true;
      }
    );
  });

  it("getCoinUniverse falls back to static top assets on network error", async () => {
    clearUniverseCache();
    const universe = await getCoinUniverse(failingFetch());
    assert.ok(universe.length >= 100);
    const doge = universe.find((c) => c.symbol === "DOGE");
    assert.ok(doge);
    assert.equal(doge.id, "dogecoin");
  });
});

// ---------------------------------------------------------------------------
// fetchSentiment
// ---------------------------------------------------------------------------

describe("fetchSentiment", () => {
  it("parses a valid Fear & Greed response", async () => {
    const sentiment = await fetchSentiment(mockFetch(MOCK_FNG_RESPONSE));
    assert.equal(sentiment.value, 72);
    assert.equal(sentiment.classification, "Greed");
  });

  it("throws DataFetchError on network failure", async () => {
    await assert.rejects(
      () => fetchSentiment(failingFetch()),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.equal(err.source, "alternative.me/fng");
        return true;
      },
    );
  });

  it("throws DataFetchError when data array is missing", async () => {
    await assert.rejects(
      () => fetchSentiment(mockFetch({ name: "Fear and Greed Index" })),
      DataFetchError,
    );
  });
});

// ---------------------------------------------------------------------------
// Stub fetchers — NotImplementedError
// ---------------------------------------------------------------------------

describe("stub fetchers", () => {
  it("fetchOnchainMetrics throws NotImplementedError", async () => {
    await assert.rejects(
      () => fetchOnchainMetrics("bitcoin"),
      (err: unknown) => {
        assert.ok(err instanceof NotImplementedError);
        assert.ok(err instanceof DataFetchError);
        assert.equal(err.source, "onchain-metrics");
        return true;
      },
    );
  });

  it("fetchSentimentFallback throws NotImplementedError", async () => {
    await assert.rejects(
      () => fetchSentimentFallback(),
      (err: unknown) => {
        assert.ok(err instanceof NotImplementedError);
        assert.equal(err.source, "sentiment-fallback");
        return true;
      },
    );
  });
});

// ---------------------------------------------------------------------------
// fetchSnapshot — integration
// ---------------------------------------------------------------------------

describe("fetchSnapshot", () => {
  beforeEach(() => snapshotCache.delete("bitcoin"));

  function mockBoth(): typeof fetch {
    return (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("coingecko")) {
        return mockFetch(MOCK_PRICE_RESPONSE)(url);
      }
      return mockFetch(MOCK_FNG_RESPONSE)(url);
    };
  }

  it("returns a snapshot with a canonical SHA-256 hash", async () => {
    const snapshot = await fetchSnapshot("bitcoin", mockBoth());
    assert.equal(snapshot.asset, "bitcoin");
    assert.match(snapshot.hash, /^[0-9a-f]{64}$/);
    // On-chain metrics not available yet — only price + sentiment sources
    assert.deepEqual(snapshot.sources, ["coingecko", "alternative.me/fng"]);
    assert.ok(snapshot.snapshotId.length > 0);
  });

  it("hash is canonical (recomputing from data matches)", async () => {
    const snapshot = await fetchSnapshot("bitcoin", mockBoth());
    const recomputed = sha256(snapshot.data);
    assert.equal(snapshot.hash, recomputed);
  });

  it("returns the exact same object on a cache hit (no second fetch)", async () => {
    const first = await fetchSnapshot("bitcoin", mockBoth());
    const second = await fetchSnapshot("bitcoin", failingFetch());
    assert.equal(first, second);
  });

  it("throws DataFetchError when the price fetch fails", async () => {
    await assert.rejects(
      () => fetchSnapshot("bitcoin", failingFetch("price api down")),
      DataFetchError,
    );
  });

  it("gracefully degrades when on-chain metrics are not implemented", async () => {
    const snapshot = await fetchSnapshot("bitcoin", mockBoth());
    // onchainMetrics should not be in data since it's NotImplemented
    assert.equal((snapshot.data as Record<string, unknown>).onchainMetrics, undefined);
    assert.ok(!snapshot.sources.includes("onchain-metrics"));
  });
});

// ---------------------------------------------------------------------------
// Fallbacks, history and technicals
// ---------------------------------------------------------------------------

const CLOSES = Array.from({ length: 211 }, (_, i) => 50_000 + i * 100);

function routedFetch(routes: Record<string, unknown>): typeof fetch {
  return ((url: string | URL | Request) => {
    const u = url.toString();
    for (const [needle, body] of Object.entries(routes)) {
      if (u.includes(needle)) {
        if (body instanceof Error) return Promise.reject(body);
        return mockFetch(body)(url);
      }
    }
    return Promise.reject(new Error(`unrouted ${u}`));
  }) as typeof fetch;
}

describe("fetchPriceFallback (CryptoCompare)", () => {
  it("maps pricemultifull to PriceData", async () => {
    const p = await fetchPriceFallback(
      "BTC",
      routedFetch({
        "coins/list": [],
        pricemultifull: { RAW: { BTC: { USD: { PRICE: 64000, MKTCAP: 1.2e12, TOTALVOLUME24HTO: 3e10, CHANGEPCT24HOUR: -1.5 } } } },
      }),
    );
    assert.equal(p.priceUsd, 64000);
    assert.equal(p.priceChangePercent24h, -1.5);
  });

  it("throws DataFetchError on an error envelope", async () => {
    await assert.rejects(
      () => fetchPriceFallback("BTC", routedFetch({ "coins/list": [], pricemultifull: { Response: "Error", Message: "rate limit" } })),
      /rate limit/,
    );
  });
});

describe("fetchSnapshot with history", () => {
  beforeEach(() => {
    snapshotCache.delete("BTC");
    historyCache.delete("BTC");
    clearUniverseCache();
  });

  it("includes technicals computed from daily history, anchored on the live price", async () => {
    const snap = await fetchSnapshot(
      "BTC",
      routedFetch({
        "coins/list": [],
        "simple/price": MOCK_PRICE_RESPONSE,
        market_chart: { prices: CLOSES.map((c, i) => [i * 86400000, c]), total_volumes: CLOSES.map((_, i) => [i * 86400000, 1e9]) },
        "alternative.me": MOCK_FNG_RESPONSE,
      }),
    );
    const t = (snap.data as any).technicals;
    assert.equal(t.lastClose, 65000);
    assert.equal(t.lookbackDays, 211);
    assert.ok(t.ema200 !== null);
    assert.equal(t.source, "coingecko/market_chart");
    assert.ok(snap.sources.includes("coingecko/market_chart"));
    assert.equal(snap.unavailable?.onchainMetrics, "no on-chain metrics provider configured");
    assert.equal(snap.unavailable?.technicals, undefined);
  });

  it("falls back to CryptoCompare for price, records missing history and sentiment", async () => {
    const snap = await fetchSnapshot(
      "BTC",
      routedFetch({
        "coins/list": [],
        "simple/price": new Error("cg down"),
        market_chart: new Error("cg down"),
        histoday: { Response: "Error", Message: "histoday limit" },
        pricemultifull: { RAW: { BTC: { USD: { PRICE: 63000 } } } },
        "alternative.me": new Error("fng down"),
      }),
    );
    assert.equal((snap.data as any).price.priceUsd, 63000);
    assert.deepEqual(snap.sources, ["cryptocompare"]);
    assert.match(snap.unavailable!.technicals!, /both failed/);
    assert.ok(snap.unavailable!.sentiment);
    assert.equal((snap.data as any).technicals, undefined);
  });
});

describe("fetchPriceAt", () => {
  const at = 1_700_000_000_000;
  beforeEach(() => clearUniverseCache());

  it("picks the CoinGecko point closest to the requested time", async () => {
    const p = await fetchPriceAt(
      "BTC",
      at,
      routedFetch({ "coins/list": [], "market_chart/range": { prices: [[at - 3_600_000, 100], [at + 600_000, 105], [at + 7_200_000, 110]] } }),
    );
    assert.equal(p.priceUsd, 105);
    assert.equal(p.source, "coingecko/range");
  });

  it("falls back to CryptoCompare and rejects points too far away", async () => {
    const p = await fetchPriceAt(
      "BTC",
      at,
      routedFetch({ "coins/list": [], "market_chart/range": { prices: [[at - 86_400_000, 1]] }, histohour: { Data: { Data: [{ time: at / 1000, close: 99 }] } } }),
    );
    assert.equal(p.priceUsd, 99);
    assert.equal(p.source, "cryptocompare/histohour");
  });

  it("refuses future timestamps", async () => {
    await assert.rejects(() => fetchPriceAt("BTC", Date.now() + 60_000, routedFetch({})), /future/);
  });
});
