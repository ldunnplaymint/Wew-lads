// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { CompoundKeyKind, WeightKind, State } from "cog/State.sol";
import { SessionRouter } from "cog/SessionRouter.sol";
import { BaseDispatcher, Rule, Context } from "cog/Dispatcher.sol";
import { StateGraph } from "cog/StateGraph.sol";
import { BaseGame } from "cog/Game.sol";
import { Schema as DawnseekersUtils } from "ds-contracts/schema/Schema.sol";

import { console } from "forge-std/console.sol";

error SeekerMustBeLocatedAtBuilding();

// define a relationship between two nodes

interface Rel {
    function CheckedIn() external;
}

// define some helpers for working with our state

library Utils {
    function checkInSeekerAtBuilding(State state, bytes24 seekerID, bytes24 buildingID) internal {
        return state.set(Rel.CheckedIn.selector, 0x0, seekerID, buildingID, 0);
    }
}

// define an action that seekers can perform at our building

interface Actions {
    function CHECK_IN(bytes24 seekerID, bytes24 buildingID) external;
}

// define a rule that implements what happens when the action is executed

contract CheckInRule is Rule {

    Game dawnseekers;

    constructor(Game dawnseekersAddr) {
        dawnseekers = dawnseekersAddr;
    }

    function reduce(State ourState, bytes calldata action, Context calldata ctx) public returns (State) {

        // log which seeker said hello
        if (bytes4(action) == Actions.CHECK_IN.selector) {
            // decode action
            (bytes24 seekerID, bytes24 buildingID) = abi.decode(action[4:], (bytes24, bytes24));

            // we only want to allow a seeker to "check in" to our building if they are
            // standing on the same tile as the building.
            // so check that seeker and building location are the same by talking to dawnseekers' state
            State ds = dawnseekers.getState();
            bytes24 seekerTile = DawnseekersUtils.getCurrentLocation(ds, seekerID, ctx.clock);
            bytes24 buildingTile = DawnseekersUtils.getFixedLocation(ds, buildingID);
            if (seekerTile != buildingTile) {
                revert SeekerMustBeLocatedAtBuilding();
            }

            // store that the seeker is now "checked in" to the building
            // each seeker can only be "checked in" to one of our buildings at a time
            Utils.checkInSeekerAtBuilding(ourState, seekerID, buildingID);
        }

        return ourState;
    }

}

// define a Game to advertise our game's state to be indexed, session routing endpoint, and action handlers

contract Game is BaseGame {

    constructor(Game dawnseekers) BaseGame("MyDawnseekersExtension", "http://playmintexample.github.io/frontendplugin") {
        // create a state
        StateGraph state = new StateGraph();

        // create a session router
        SessionRouter router = new SessionRouter();

        // create a rule to handle the SIGN_GUESTBOOK action
        Rule guestbookRule = new CheckInRule(dawnseekers);

        // configure our dispatcher with state, rules and trust the router
        BaseDispatcher dispatcher = new BaseDispatcher();
        dispatcher.registerState(state);
        dispatcher.registerRule(guestbookRule);
        dispatcher.registerRouter(router);

        // update the game with this config
        _registerState(state);
        _registerRouter(router);
        _registerDispatcher(dispatcher);

    }

}
