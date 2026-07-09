import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { fetchPrice } from "./fetchers/price.js";
import { fetchSentiment } from "./fetchers/sentiment.js";
import { fetchSnapshot, snapshotCache } from "./snapshot.js";
import { sha256 } from "./hash.js";
import { TtlCache } from "./cache.js";
import { DataFetchError } from "./errors.js";

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
// sha256
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
    const cache = new TtlCache<string>(1); // 1ms TTL
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
      }
    );
  });

  it("throws DataFetchError on non-2xx response", async () => {
    await assert.rejects(
      () => fetchPrice("bitcoin", mockFetch({}, 429)),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.match(err.message, /429/);
        return true;
      }
    );
  });

  it("throws DataFetchError when coin id is not in response", async () => {
    // CoinGecko returns {} for unknown ids instead of a 4xx
    await assert.rejects(
      () => fetchPrice("notarealcoin", mockFetch({})),
      (err: unknown) => {
        assert.ok(err instanceof DataFetchError);
        assert.match(err.message, /no data returned/);
        return true;
      }
    );
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
      }
    );
  });

  it("throws DataFetchError when data array is missing", async () => {
    await assert.rejects(
      () => fetchSentiment(mockFetch({ name: "Fear and Greed Index" })),
      DataFetchError
    );
  });
});

// ---------------------------------------------------------------------------
// fetchSnapshot — integration of price + sentiment + hashing + cache
// ---------------------------------------------------------------------------

describe("fetchSnapshot", () => {
  // Clear the module-level cache between tests
  beforeEach(() => snapshotCache.delete("bitcoin"));

  function mockBoth(): typeof fetch {
    return (url: string | URL | Request, ...rest: Parameters<typeof fetch>[1][]) => {
      const urlStr = url.toString();
      if (urlStr.includes("coingecko")) {
        return mockFetch(MOCK_PRICE_RESPONSE)(url, ...rest);
      }
      return mockFetch(MOCK_FNG_RESPONSE)(url, ...rest);
    };
  }

  it("returns a snapshot with a stable SHA-256 hash", async () => {
    const snapshot = await fetchSnapshot("bitcoin", mockBoth());
    assert.equal(snapshot.asset, "bitcoin");
    assert.match(snapshot.hash, /^[0-9a-f]{64}$/);
    assert.deepEqual(snapshot.sources, ["coingecko", "alternative.me/fng"]);
    assert.ok(snapshot.snapshotId.length > 0);
  });

  it("returns the exact same object on a cache hit (no second fetch)", async () => {
    const first = await fetchSnapshot("bitcoin", mockBoth());

    // Second call uses a fetch that always fails — proves the cache was hit
    const second = await fetchSnapshot("bitcoin", failingFetch());
    assert.equal(first, second); // same reference
  });

  it("hashes are deterministic for identical data payloads", async () => {
    // Build a snapshot manually and verify the hash matches what sha256 would produce
    const snapshot = await fetchSnapshot("bitcoin", mockBoth());
    const expectedHash = sha256(snapshot.data);
    assert.equal(snapshot.hash, expectedHash);
  });

  it("throws DataFetchError when the price fetch fails", async () => {
    await assert.rejects(
      () => fetchSnapshot("bitcoin", failingFetch("price api down")),
      DataFetchError
    );
  });
});
