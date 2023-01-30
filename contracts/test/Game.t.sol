// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import { State } from "cog/State.sol";
import { Dispatcher } from "cog/Dispatcher.sol";
import { Game } from "cog/Game.sol";

import { Game as DawnseekersGame } from "ds-contracts/Game.sol";
import { BiomeKind } from "ds-contracts/schema/Schema.sol";
import { Actions as DawnseekersActions } from "ds-contracts/actions/Actions.sol";

import { Extension } from "Game.sol";

contract ScoutRuleTest is Test {

    Game internal dsGame;
    Game internal extGame;
    State internal dsState;
    State internal extState;

    // accounts
    address aliceAccount;

    function setUp() public {
        // setup dawnseekers
        dsGame = new DawnseekersGame();
        dsState = dsGame.getState();

        extGame = new ExtensionGame(dsGame);
        extState = extGame.getState();

        // setup users
        uint256 alicePrivateKey = 0xA11CE;
        aliceAccount = vm.addr(alicePrivateKey);
    }


    function testCheckInBuilding() public {
        // act as the player "alice"
        vm.startPrank(aliceAccount);

        // force tile 0,0,0 DISCOVERED
        dsGame.getDispatcher().dispatch(
            abi.encodeCall(DawnseekersActions.DEV_SPAWN_TILE, (
                BiomeKind.DISCOVERED,
                0,   // q
                0,   // r
                0    // s
            ))
        );

        // create a seeker for alice
        dsGame.getDispatcher().dispatch(
            abi.encodeCall(DawnseekersActions.DEV_SPAWN_SEEKER, (
                aliceAccount, // owner
                1,   // seeker id (sid)
                0,   // q
                0,   // r
                0    // s
            ))
        );

        // stop acting as alice
        vm.stopPrank();
    }


}
