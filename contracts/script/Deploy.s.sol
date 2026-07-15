// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PenguinRegistry} from "../src/PenguinRegistry.sol";

/// @title Deploy — PenguinRegistry deploy script (ONCHAIN.md §6)
///
/// Usage (dry run, no broadcast):
///   source .env
///   forge script script/Deploy.s.sol \
///     --rpc-url $MONAD_TESTNET_RPC_URL \
///     --private-key $MONAD_TESTNET_PRIVATE_KEY
///
/// Usage (broadcast — ONLY after explicit go-ahead):
///   forge script script/Deploy.s.sol \
///     --rpc-url $MONAD_TESTNET_RPC_URL \
///     --private-key $MONAD_TESTNET_PRIVATE_KEY \
///     --broadcast
///
/// After deployment, copy the printed address into .env as MONAD_REGISTRY_ADDRESS.
contract Deploy is Script {
    function run() external returns (PenguinRegistry registry) {
        // Read deployer key from environment — never hardcode a private key.
        uint256 deployerKey = vm.envUint("MONAD_TESTNET_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("=== PenguinRegistry Deploy ===");
        console.log("Deployer:  ", deployer);
        console.log("Chain ID:  ", block.chainid);
        console.log("RPC:        Monad testnet (10143)");

        vm.startBroadcast(deployerKey);
        registry = new PenguinRegistry();
        vm.stopBroadcast();

        console.log("Contract:  ", address(registry));
        console.log("");
        console.log("Next step: add to .env:");
        console.log("  MONAD_REGISTRY_ADDRESS=", address(registry));
        console.log("");
        console.log("Verify on block explorer:");
        console.log("  https://testnet.monadexplorer.com/address/", address(registry));
    }
}
