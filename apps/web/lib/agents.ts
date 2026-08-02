// Display metadata for the v1 agent roster (SYNDICATE.md §1).
// This is product feature copy — names and frameworks — not analysis data.

export interface AgentDisplayInfo {
  id: string;
  name: string;
  framework: string;
  bias: string;
}

export const AGENT_ROSTER: AgentDisplayInfo[] = [
  {
    id: "value-hunter",
    name: "Value Hunter",
    framework: "Graham margin-of-safety · Buffett moat analysis",
    bias: "Rejects speculative hype",
  },
  {
    id: "momentum-trader",
    name: "Momentum Trader",
    framework: "RSI / MACD / EMA / VWAP · Volume-confirmed breakouts",
    bias: "Prioritizes immediate trend",
  },
  {
    id: "macro-analyst",
    name: "Macro Analyst",
    framework: "Global M2 · Fed policy · DXY · Halving cycles",
    bias: "Thinks globally and cyclically",
  },
  {
    id: "onchain-sleuth",
    name: "On-chain Sleuth",
    framework: "MVRV / SOPR · Exchange netflows · Whale accumulation",
    bias: "Thinks blockchain-first",
  },
  {
    id: "risk-guardian",
    name: "Risk Guardian",
    framework: "Howard Marks cycles · Taleb tail-risk · Kelly sizing",
    bias: "Stays cautious, challenges assumptions",
  },
];
