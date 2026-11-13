import { MonadChainAdapter, explorerTxUrl } from "@argus/chain-adapters";

export { explorerTxUrl };

let adapter: MonadChainAdapter | null = null;

/** Server-side chain adapter singleton (AGENTS.md §11: no chain SDK outside chain-adapters). */
export function getChainAdapter(): MonadChainAdapter {
  adapter ??= new MonadChainAdapter();
  return adapter;
}

/** Test seam. */
export function setChainAdapterForTests(next: MonadChainAdapter | null): void {
  adapter = next;
}
