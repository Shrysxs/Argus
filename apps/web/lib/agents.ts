// Display metadata for the agent roster (SYNDICATE.md §1). Copy describes
// what each agent actually analyzes given the data it receives.

export interface AgentDisplayInfo {
  id: string;
  name: string;
  short: string;
  framework: string;
  inputs: string;
  bias: string;
}

export const AGENT_ROSTER: AgentDisplayInfo[] = [
  {
    id: "value-hunter",
    name: "Value Hunter",
    short: "VAL",
    framework: "Margin of safety · relative valuation",
    inputs: "Market cap, 90-day drawdown, long-horizon returns",
    bias: "Rejects speculative hype",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    short: "MOM",
    framework: "RSI · MACD · EMA trend · volume confirmation",
    inputs: "Daily technicals computed from ~210 days of closes",
    bias: "Prioritizes the prevailing trend",
  },
  {
    id: "macro-analyst",
    name: "Macro Analyst",
    short: "MAC",
    framework: "Risk appetite · long-cycle regime",
    inputs: "Fear & Greed index, 90-day trend, EMA-200 positioning",
    bias: "Thinks in cycles, not candles",
  },
  {
    id: "onchain-sleuth",
    name: "On-chain Sleuth",
    short: "ONC",
    framework: "MVRV · SOPR · exchange netflows",
    inputs: "On-chain metrics (abstains when no provider is connected)",
    bias: "Trusts the ledger over the narrative",
  },
  {
    id: "risk-guardian",
    name: "Risk Guardian",
    short: "RSK",
    framework: "Volatility-adjusted conviction · drawdown control",
    inputs: "Realized volatility, drawdown, RSI extremes, sentiment",
    bias: "Challenges every assumption",
  },
];

export const agentById = (id: string) => AGENT_ROSTER.find((a) => a.id === id);
