// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {PenguinRegistry} from "../src/PenguinRegistry.sol";

contract PenguinRegistryTest is Test {
    PenguinRegistry public registry;

    // Fixed test data
    bytes32 constant DATA_HASH =
        0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890;
    bytes32 constant PROMPT_HASH =
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    uint256 constant TIMESTAMP = 1_720_000_000;

    function setUp() public {
        registry = new PenguinRegistry();
    }

    // -------------------------------------------------------------------------
    // Construction
    // -------------------------------------------------------------------------

    function test_deploySucceeds() public view {
        assertTrue(address(registry) != address(0));
    }

    function test_noStateAfterDeploy() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Event emission — BUY / SELL / HOLD
    // -------------------------------------------------------------------------

    function test_emitsBuyDecision() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", 8333, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "BUY", 8333, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function test_emitsSellDecision() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "ETH", "SELL", 6000, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("ETH", "SELL", 6000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function test_emitsHoldDecision() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "SOL", "HOLD", 5000, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("SOL", "HOLD", 5000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Field encoding — all non-indexed fields round-trip correctly
    // -------------------------------------------------------------------------

    function test_allFieldsEncodedCorrectly() public {
        string memory asset = "BTC";
        string memory decision = "BUY";
        uint256 confidence = 7000;
        bytes32 dataHash = DATA_HASH;
        bytes32 promptHash = PROMPT_HASH;
        uint256 ts = TIMESTAMP;

        vm.recordLogs();
        registry.recordDecision(asset, decision, confidence, dataHash, promptHash, ts);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 1, "expected exactly one log");
        assertEq(logs[0].topics.length, 2, "expected 2 topics: selector + sender");

        address emittedSender = address(uint160(uint256(logs[0].topics[1])));
        assertEq(emittedSender, address(this), "sender mismatch");

        (
            string memory emittedAsset,
            string memory emittedDecision,
            uint256 emittedConfidence,
            bytes32 emittedDataHash,
            bytes32 emittedPromptHash,
            uint256 emittedTs
        ) = abi.decode(logs[0].data, (string, string, uint256, bytes32, bytes32, uint256));

        assertEq(emittedAsset, asset, "asset mismatch");
        assertEq(emittedDecision, decision, "decision mismatch");
        assertEq(emittedConfidence, confidence, "confidence mismatch");
        assertEq(emittedDataHash, dataHash, "dataSnapshotHash mismatch");
        assertEq(emittedPromptHash, promptHash, "promptVersionHash mismatch");
        assertEq(emittedTs, ts, "timestamp mismatch");
    }

    // -------------------------------------------------------------------------
    // Indexed sender — different callers emit correct address
    // -------------------------------------------------------------------------

    function test_senderIsCorrectForDifferentCallers() public {
        address alice = makeAddr("alice");
        address bob = makeAddr("bob");

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP, alice
        );
        registry.recordDecision("BTC", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP);

        vm.prank(bob);
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "SELL", 4500, DATA_HASH, PROMPT_HASH, TIMESTAMP, bob
        );
        registry.recordDecision("BTC", "SELL", 4500, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Confidence boundary
    // -------------------------------------------------------------------------

    function test_confidenceZeroIsValid() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "HOLD", 0, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "HOLD", 0, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function test_confidenceMaxIsValid() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", 10_000, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "BUY", 10_000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function test_confidenceAboveMaxReverts() public {
        vm.expectRevert("PenguinRegistry: confidence exceeds 10000 bps");
        registry.recordDecision("BTC", "BUY", 10_001, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Input validation
    // -------------------------------------------------------------------------

    function test_emptyAssetReverts() public {
        vm.expectRevert("PenguinRegistry: asset must not be empty");
        registry.recordDecision("", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function test_emptyDecisionReverts() public {
        vm.expectRevert("PenguinRegistry: decision must not be empty");
        registry.recordDecision("BTC", "", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Zero-value hashes are valid
    // -------------------------------------------------------------------------

    function test_zeroHashesAreAccepted() public {
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", 7000, bytes32(0), bytes32(0), TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "BUY", 7000, bytes32(0), bytes32(0), TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // No funds held
    // -------------------------------------------------------------------------

    function test_contractDoesNotAcceptEther() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(registry).call{value: 1 ether}("");
        assertFalse(ok, "registry should not accept ether");
    }

    // -------------------------------------------------------------------------
    // Fuzz tests
    // -------------------------------------------------------------------------

    function testFuzz_validConfidenceRange(uint256 confidence) public {
        confidence = bound(confidence, 0, 10_000);
        vm.expectEmit(true, false, false, true);
        emit PenguinRegistry.DecisionRecorded(
            "BTC", "BUY", confidence, DATA_HASH, PROMPT_HASH, TIMESTAMP, address(this)
        );
        registry.recordDecision("BTC", "BUY", confidence, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    function testFuzz_invalidConfidenceReverts(uint256 confidence) public {
        confidence = bound(confidence, 10_001, type(uint256).max);
        vm.expectRevert("PenguinRegistry: confidence exceeds 10000 bps");
        registry.recordDecision("BTC", "BUY", confidence, DATA_HASH, PROMPT_HASH, TIMESTAMP);
    }

    // -------------------------------------------------------------------------
    // Event selector
    // -------------------------------------------------------------------------

    function test_eventSelectorMatchesExpected() public {
        bytes32 expectedSelector = keccak256(
            "DecisionRecorded(string,string,uint256,bytes32,bytes32,uint256,address)"
        );
        vm.recordLogs();
        registry.recordDecision("BTC", "BUY", 7000, DATA_HASH, PROMPT_HASH, TIMESTAMP);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs[0].topics[0], expectedSelector, "event selector mismatch");
    }
}
