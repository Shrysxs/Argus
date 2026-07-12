# MATH.md — Argus Formula Reference

> Source of truth. If any other doc, any contract, or any package disagrees with this file, this file wins and the other thing is a bug.

**Owns:** `packages/consensus`, and the reference formulas that `ONCHAIN.md` contracts and `BACKEND.md` pricing logic must implement identically.
**Talks to:** `SYNDICATE.md` (consumes `AgentVote[]`), `ONCHAIN.md` (contracts enforcing bonding curves/vaults must match §4/§5 exactly), `BACKEND.md` (API pricing endpoints call these functions, never reimplement them).

---

## 1. Consensus Engine

Input: `AgentVote[]` from `packages/shared-types` (`{ agentId, vote, confidence, reasoning, dataPointsCited }`).

$$W_d = \sum_{i \,:\, v_i = d} c_i \quad \text{for } d \in \{BUY, SELL, HOLD\}$$

$$\text{Recommendation} = \arg\max_d W_d \qquad \text{Confidence} = \frac{W_{\text{Recommendation}}}{\sum_d W_d} \times 100$$

**Disagreement flag:** set `true` if the top two $W_d$ values are within a configurable margin (default 10% of total weight) of each other. Never suppress this — it's part of the output type, not a side log.

Output type: `ConsensusResult { recommendation, confidence, breakdown: Record<Decision, number>, disagreement: boolean }`.

Pure function. No I/O. Lives in `packages/consensus`, fully unit tested — see `AGENT.md` §6 for the non-negotiables (no network calls, no chain calls).

---

## 2. Reputation Index (per agent)

Decayed Brier score against an agent's own historical calls:

$$R_i(t) = 1 - \frac{\sum_k w_k (f_k - o_k)^2}{\sum_k w_k}$$

- $f_k$ — agent's stated confidence on past call $k$ (normalized 0–1)
- $o_k \in \{0, 1\}$ — whether the call was correct
- $w_k$ — exponential recency-decay weight, $w_k = e^{-\lambda \cdot \Delta t_k}$, $\lambda$ tunable (start with a ~90-day half-life)

$R_i(t) \in [0, 1]$. This is what feeds both the reputation marketplace leaderboard and the bonding curve in §5.

---

## 3. Signal Information Value (entropy pricing)

$$H(p) = -\sum_d p_d \log_2 p_d, \quad p_d = \frac{W_d}{\sum_d W_d}, \quad H_{max} = \log_2 3 \approx 1.585$$

$$I = H_{max} - H(p) \in [0, H_{max}]$$

$$\text{Price}_{\text{call}} = \text{base} \times \left(\frac{I}{H_{max}}\right)^{\gamma} \times \text{vol multiplier}, \quad \gamma \in [2,3]$$

Volatility multiplier = realized ATR of the asset over a trailing window, normalized against a baseline asset (start with BTC as baseline = 1.0x).

---

## 4. Auction Reserve Price (Kelly-derived)

$$f^* = \frac{p \cdot b - (1-p)}{b}$$

- $p$ — win probability. **v1: use consensus confidence directly as a proxy.** v2: replace with a calibration curve mapping stated confidence → actual historical hit rate, once enough on-chain decisions exist to build it (don't fake this curve before there's real data — ship v1 honestly labeled as a proxy).
- $b$ — payoff odds, approximated as (typical realized move size) / (typical stop distance) for the asset class. Start with a fixed lookup table per asset, refine later.

$$ESV = f^* \times AUM_{ref} \quad (\text{reference notional, e.g. \$100k — not a real balance})$$

$ESV$ is the auction reserve price. Clearing price is the (N+1)th highest sealed bid — see `ONCHAIN.md` §3 for the commit-reveal mechanics this requires.

---

## 5. Bonding Curve (agent reputation tokens)

$$P_i(R) = P_0 \cdot e^{k \cdot R_i(t)}$$

$P_0$ and $k$ are per-agent launch parameters, set once at token creation, immutable after (a curve whose slope can be changed post-launch isn't trustworthy — don't build an admin knob for this). $R_i(t)$ comes from §2.

---

## 6. Vault Fee (performance carry)

$$\text{Fee} = m \cdot AUM + p \cdot \max(0, V_t - HWM)$$

- $m$ — management fee, annualized, charged pro-rata per period (start 0.5–1%)
- $p$ — performance fee on new profit only (start 15–20%)
- $HWM$ — high-water mark, updates only upward, tracked on-chain per vault (see `ONCHAIN.md` §4)

---

## 7. Testing Requirements

Every formula in this file needs, at minimum: one clear-case test, one edge case (zero/tied inputs), and one boundary case (max entropy, zero confidence, negative profit for vaults). `packages/consensus` is the reference implementation for §1 — §3–6 should be implemented in `packages/consensus` or a sibling pure-math package as well, never inline in API route handlers or contracts, so both `BACKEND.md` and `ONCHAIN.md` import the same tested function instead of each writing their own copy.