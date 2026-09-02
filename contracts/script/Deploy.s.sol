// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PenguinRegistry} from "../src/PenguinRegistry.sol";

/// @title Deploy — PenguinRegistry deploy script (ONCHAIN.md §6)
///
/// Keystore-only usage:
///   forge script script/Deploy.s.sol \
///     --rpc-url https://testnet-rpc.monad.xyz \
///     --account monad-deployer \
///     --broadcast
///
/// After deployment, copy the printed address into .env and apps/web/.env as MONAD_REGISTRY_ADDRESS.
contract Deploy is Script {
    function run() external returns (PenguinRegistry registry) {
        console.log("=== PenguinRegistry Deploy ===");
        console.log("Deployer:  ", msg.sender);
        console.log("Chain ID:  ", block.chainid);
        console.log("RPC:        Monad testnet (10143)");

        vm.startBroadcast();
        registry = new PenguinRegistry();
        vm.stopBroadcast();

        console.log("Contract:  ", address(registry));
        console.log("");
        console.log("Next step: add to .env and apps/web/.env:");
        console.log("  MONAD_REGISTRY_ADDRESS=", address(registry));
        console.log("");
        console.log("Verify on block explorer:");
        console.log("  https://testnet.monadexplorer.com/address/", address(registry));
    }
}
