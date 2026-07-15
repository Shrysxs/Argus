// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PenguinRegistry — Argus on-chain decision record (ONCHAIN.md §2)
///
/// Minimal, record-only contract: accepts a decision payload, emits an event,
/// never custodies funds, never gatekeeps (AGENTS.md §4.3, §9).
///
/// Two fields added vs. the hackathon version:
///   - dataSnapshotHash: ties the decision to a specific data snapshot (DATA.md §2)
///   - promptVersionHash: ties the decision to specific agent prompt versions (SYNDICATE.md §2)
///
/// Both are bytes32 (sha256-derived) so any third party can recompute and verify.
///
/// Confidence is stored as basis points (0–10000) to preserve one decimal place
/// of precision without floating point (e.g., 70.00% → 7000 bps).
contract PenguinRegistry {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted every time a syndicate consensus decision is recorded.
    /// @param asset        The asset analyzed (e.g. "BTC", "ETH").
    /// @param decision     The consensus recommendation: "BUY", "SELL", or "HOLD".
    /// @param confidence   Confidence in basis points (0–10000, where 10000 = 100.00%).
    /// @param dataSnapshotHash sha256 hash of the MarketDataSnapshot that fed this decision.
    ///                     Enables third-party verification: same data → same hash (DATA.md §2).
    /// @param promptVersionHash sha256 hash of the agent prompt versions used (SYNDICATE.md §2).
    ///                     Ensures the decision is tied to specific, immutable prompt text.
    /// @param timestamp    Unix timestamp (seconds) when the decision was sealed.
    /// @param sender       Address that called recordDecision — indexed for log filtering.
    event DecisionRecorded(
        string asset,
        string decision,
        uint256 confidence,
        bytes32 dataSnapshotHash,
        bytes32 promptVersionHash,
        uint256 timestamp,
        address indexed sender
    );

    // -------------------------------------------------------------------------
    // State (none — this contract deliberately holds no state)
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // Functions
    // -------------------------------------------------------------------------

    /// @notice Record a consensus decision on-chain.
    ///
    /// Emits DecisionRecorded and returns. No state is written, no funds are
    /// moved or held. The event log is the canonical record.
    ///
    /// @param asset             The asset analyzed (e.g. "BTC").
    /// @param decision          Consensus recommendation: "BUY", "SELL", or "HOLD".
    /// @param confidence        Confidence in basis points (0–10000).
    /// @param dataSnapshotHash  sha256 of the MarketDataSnapshot (bytes32).
    /// @param promptVersionHash sha256 of agent prompt versions (bytes32).
    /// @param timestamp         Unix timestamp in seconds.
    function recordDecision(
        string calldata asset,
        string calldata decision,
        uint256 confidence,
        bytes32 dataSnapshotHash,
        bytes32 promptVersionHash,
        uint256 timestamp
    ) external {
        require(confidence <= 10_000, "PenguinRegistry: confidence exceeds 10000 bps");
        require(bytes(asset).length > 0, "PenguinRegistry: asset must not be empty");
        require(bytes(decision).length > 0, "PenguinRegistry: decision must not be empty");

        emit DecisionRecorded(
            asset,
            decision,
            confidence,
            dataSnapshotHash,
            promptVersionHash,
            timestamp,
            msg.sender
        );
    }
}
