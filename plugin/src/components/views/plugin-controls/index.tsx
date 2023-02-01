/** @format */

import { FunctionComponent, useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './plugin-control.styles';
import { Anchor } from '@app/types/anchor';
import { useCogPlugin } from '@app/contexts/cog-plugin-provider';
import { OnStateDocument, useGetStateQuery } from '@app/types/queries';
import { useApolloClient } from '@apollo/client';
import { useNetworkContext } from '@app/contexts/network-provider';
import { BigNumber } from 'ethers';

export interface CornSeekerControlProps extends ComponentProps {
    width: number;
    height: number;
    anchor: Anchor;
}

const USE_TOP_LEFT_ORIGIN = false; // Like screen coords, top left is 0,0 with y increasing downwards. Unity's coordinate system is inverse of this i.e. bottom left origin

const StyledCornSeekerControl = styled('div')`
    ${styles}
`;

interface Seeker {
    seekerID: string;
    location: {
        tile: {
            keys: string[];
        };
    }[];
}

enum Direction {
    NW,
    NE,
    E,
    SE,
    SW,
    W
}

export const CornSeekerControl: FunctionComponent<CornSeekerControlProps> = (props: CornSeekerControlProps) => {
    const { width, height, anchor, ...otherProps } = props;
    const { account } = useNetworkContext();
    const { registerPlugin, dispatchAction } = useCogPlugin();
    const client = useApolloClient();
    const [hasRegistered, setHasRegistered] = useState(false);
    const qInput = useRef<HTMLInputElement>(null);
    const rInput = useRef<HTMLInputElement>(null);
    const sInput = useRef<HTMLInputElement>(null);

    // -- Messages from shell
    useEffect(() => {
        const handleMessage = (message: any) => {
            const { method, args } = message.data;
            console.log(`CornSeekerControl: Received message from shell. method: ${method} args: `, args);
            console.log(`CornSeekerControl: message`, message);
        };

        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    });

    // -- Initial state query
    const { data: stateData } = useGetStateQuery({
        client
    });
    const [state, setState] = useState(stateData?.game.state);

    // -- State subscription
    client
        .subscribe({
            query: OnStateDocument
        })
        .subscribe(
            (result) => setState(result.data.state),
            (err) => console.error('stateSubscriptionError', err),
            () => console.warn('stateSubscriptionClosed')
        );

    useEffect(() => {
        if (stateData) {
            setState(stateData.game.state);
        }
    }, [stateData]);

    useEffect(() => {
        if (!hasRegistered) {
            registerPlugin(width, height, anchor);
            setHasRegistered(true);
        }
    });

    const getPlayerSeeker = (account?: string | null) => {
        if (state && account) {
            const seekerId = BigInt(account) & BigInt('0xffffffff');
            return state.seekers.find((seeker) => seeker.seekerID == seekerId);
        }

        return null;
    };

    const playerSeeker = getPlayerSeeker(account);

    // -- SEEKER
    interface TileCoords {
        q: number;
        r: number;
        s: number;
    }

    const spawnSeeker = () => {
        if (!account) return;

        const seekerId = BigInt(account) & BigInt('0xffffffff');
        const q = 0;
        const r = 0;
        const s = 0;

        dispatchAction('DEV_SPAWN_SEEKER', account, seekerId, q, r, s);
    };

    const getTileCoords = (tile: any): TileCoords => {
        const [_, qHex, rHex, sHex] = tile.keys;
        return {
            q: BigNumber.from(qHex).fromTwos(16).toNumber(),
            r: BigNumber.from(rHex).fromTwos(16).toNumber(),
            s: BigNumber.from(sHex).fromTwos(16).toNumber()
        };
    };

    const moveSeeker = (dir: Direction) => {
        if (!account || !state) return;

        const seeker = getPlayerSeeker(account);
        if (seeker && seeker.seekerID) {
            const currentTile = seeker.location[1].tile;
            const currentTileCoords = getTileCoords(currentTile);
            const destCoords = getCoordsForDirection(dir, currentTileCoords);

            console.log(`moveSeeker(): `, destCoords);
            dispatchAction('MOVE_SEEKER', seeker.seekerID, destCoords.q, destCoords.r, destCoords.s);
        }
    };

    const spawnTileInDirection = (dir: Direction) => {
        if (!account || !state) return;

        const seeker = getPlayerSeeker(account);
        if (seeker && seeker.seekerID) {
            const currentTile = seeker.location[1].tile;
            const currentTileCoords = getTileCoords(currentTile);

            const destCoords = getCoordsForDirection(dir, currentTileCoords);
            const kind = 1; // discovered

            console.log(`spawnTileInDirection(): `, destCoords);
            dispatchAction('DEV_SPAWN_TILE', kind, destCoords.q, destCoords.r, destCoords.s);
        }
    };

    const getCoordsForDirection = (dir: Direction, coords: TileCoords) => {
        return USE_TOP_LEFT_ORIGIN
            ? getCoordsForDirectionTLOrigin(dir, coords)
            : getCoordsForDirectionBLOrigin(dir, coords);
    };

    const getCoordsForDirectionTLOrigin = (dir: Direction, coords: TileCoords) => {
        let { q, r, s } = coords;

        switch (dir) {
            case Direction.NW:
                r--;
                s++;
                break;
            case Direction.NE:
                q++;
                r--;
                break;
            case Direction.E:
                q++;
                s--;
                break;
            case Direction.SE:
                r++;
                s--;
                break;
            case Direction.SW:
                q--;
                r++;
                break;
            case Direction.W:
                q--;
                s++;
                break;
        }

        return { q, r, s };
    };

    const getCoordsForDirectionBLOrigin = (dir: Direction, coords: TileCoords) => {
        let { q, r, s } = coords;

        switch (dir) {
            case Direction.SW:
                r--;
                s++;
                break;
            case Direction.SE:
                q++;
                r--;
                break;
            case Direction.E:
                q++;
                s--;
                break;
            case Direction.NE:
                r++;
                s--;
                break;
            case Direction.NW:
                q--;
                r++;
                break;
            case Direction.W:
                q--;
                s++;
                break;
        }

        return { q, r, s };
    };

    const spawnTile = () => {
        const q = qInput.current?.value;
        const r = rInput.current?.value;
        const s = sInput.current?.value;
        const kind = 1; // discovered

        console.log(`spawnTile(): kind: ${kind} q:${q} r:${r} s:${s}`);
        dispatchAction('DEV_SPAWN_TILE', kind, q, r, s);
    };

    const outputLocation = (seeker: Seeker) => {
        const currentTile = seeker.location[1].tile;
        const { q, r, s } = getTileCoords(currentTile);
        return (
            <p>
                Q:{q}, R:{r}, S:{s}
            </p>
        );
    };

    return (
        <StyledCornSeekerControl {...otherProps}>
            <h2>Dawn Seeker Control</h2>
            {account && <p>Account: {account}</p>}
            {playerSeeker ? (
                <div>
                    <h3>Move Seeker</h3>
                    <p>Seeker ID: {playerSeeker.seekerID}</p>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.NW)}}>NW</button>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.NE)}}>NE</button>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.E)}}>E</button>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.SE)}}>SE</button>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.SW)}}>SW</button>
                    {/* prettier-ignore */}
                    <button onClick={() => {moveSeeker(Direction.W)}}>W</button>
                </div>
            ) : (
                <button onClick={spawnSeeker}>Spawn Seeker</button>
            )}

            <h3>Spawn Tile (from seeker position)</h3>
            <div>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.NW)}}>NW</button>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.NE)}}>NE</button>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.E)}}>E</button>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.SE)}}>SE</button>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.SW)}}>SW</button>
                {/* prettier-ignore */}
                <button onClick={() => {spawnTileInDirection(Direction.W)}}>W</button>
            </div>

            <form>
                <label>
                    q:
                    <input ref={qInput} id="q" type="number" />
                </label>
                <label>
                    r:
                    <input ref={rInput} id="r" type="number" />
                </label>
                <label>
                    s:
                    <input ref={sInput} id="s" type="number" />
                </label>
            </form>

            <button onClick={spawnTile}>Spawn Tile</button>

            {playerSeeker && playerSeeker.location.length > 0 && outputLocation(playerSeeker as Seeker)}
        </StyledCornSeekerControl>
    );
};
