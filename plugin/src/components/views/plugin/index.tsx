/** @format */

import { FunctionComponent, useEffect, useState } from 'react';
import { useSessionContext } from '@app/contexts/cog-session-provider';
import styled from '@emotion/styled';
import { ComponentProps } from '@app/types/component-props';
import {
    List,
    ListItem,
    ListIcon,
    Card,
    Text,
    CardHeader,
    Heading,
    CardBody,
    Button,
    ButtonGroup,
    Alert,
    AlertIcon
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { ethers, BigNumber } from 'ethers';
import { useCogPlugin } from '@app/contexts/cog-plugin-provider';
import { Anchor } from '@app/types/anchor';
import { useGetStateQuery } from '@app/types/queries';
import { Auth } from '@app/components/views/auth';

type TileCoords = [number, number, number] | null;

export interface PluginProps extends ComponentProps {
    id: string; // contract address of extension
    width: number;
    height: number;
    anchor: Anchor;
}

const StyledPlugin = styled.div`
    opacity: 0.95;
`;

function getAddress(addr: string): string | null {
    try {
        return ethers.utils.getAddress(addr).toString();
    } catch {
        return null;
    }
}

export const Plugin: FunctionComponent<PluginProps> = (props: PluginProps) => {
    const { width, height, anchor, id: extID } = props;
    const { registerPlugin } = useCogPlugin();
    const { dispatch } = useSessionContext();
    const { hasSignedIn } = useSessionContext();
    const [hasRegistered, setHasRegistered] = useState(false);
    const [selectedTile, setSelectedTile] = useState<TileCoords>(null);
    const [account, setAccount] = useState<string | null>(null);

    useEffect(() => {
        const handleMessage = (message: any) => {
            const { method, args } = message.data;
            if (method != 'tileInteraction') {
                return;
            }
            setSelectedTile(args as TileCoords);

            console.log('ExamplePlugin: tile selected', args);
        };

        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    });

    useEffect(() => {
        const handleMessage = (message: any) => {
            const { method, args } = message.data;
            switch (method) {
                case 'ready': {
                    const [account] = args;
                    console.log('ExamplePlugin recv: ready', account);
                    setAccount(account);
                    break;
                }
                case 'tileInteraction': {
                    const [q, r, s] = args;
                    console.log('ExamplePlugin recv: tileInteraction', q, r, s);
                    setSelectedTile([q, r, s]);
                    break;
                }
            }
        };

        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    });

    useEffect(() => {
        if (!hasRegistered) {
            registerPlugin(width, height, anchor);
            setHasRegistered(true);
        }
    }, [hasRegistered, width, height, anchor, registerPlugin]);

    const { data, error: queryError } = useGetStateQuery({
        pollInterval: 2000,
        variables: { extID: getAddress(extID) || '' }
    });

    const selectedSeeker = data?.game?.state.seekers.find((seeker) => {
        if (!seeker.owner) {
            return false;
        }
        if (seeker.owner.addr == '0x0') {
            return false;
        }
        console.log(seeker.owner.addr, 'vs', account, 'vs', getAddress(seeker.owner.addr));
        return getAddress(seeker.owner.addr) == account;
    });

    const getSelectedBuilding = () => {
        if (!data) {
            return;
        }
        if (!account) {
            return;
        }
        if (!selectedTile) {
            return;
        }
        return data?.game?.state.buildings.find((b) => {
            if (!b.location) {
                return false;
            }
            return (
                BigNumber.from(b.location.tile.keys[1]).fromTwos(16).toNumber() == selectedTile[0] &&
                BigNumber.from(b.location.tile.keys[2]).fromTwos(16).toNumber() == selectedTile[1] &&
                BigNumber.from(b.location.tile.keys[3]).fromTwos(16).toNumber() == selectedTile[2]
            );
        });
    };

    const selectedBuilding = getSelectedBuilding();

    const handleClickCheckin = () => {
        if (!selectedTile) {
            console.error('plugin: no selectedTile');
            return;
        }
        if (!account) {
            console.error('plugin: no account');
            return;
        }
        if (!selectedSeeker) {
            console.error('plugin: no selectedSeeker');
            return;
        }
        if (!selectedBuilding) {
            console.error('plugin: no selectedBuilding');
            return;
        }
        if (!data?.extension) {
            console.error('plugin: no extension');
            return;
        }
        dispatch(data.extension.name, 'CHECK_IN', selectedSeeker.id, selectedBuilding.id);
    };

    const tileDistance = (a: TileCoords, b: TileCoords) => {
        if (!a || !b) {
            return -1;
        }
        return Math.floor((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 2);
    };

    const getCoords = (keys: string[]): TileCoords => {
        return [
            BigNumber.from(keys[1]).fromTwos(16).toNumber(),
            BigNumber.from(keys[2]).fromTwos(16).toNumber(),
            BigNumber.from(keys[3]).fromTwos(16).toNumber()
        ];
    };

    const getCurrentSeekerLocation = (): TileCoords => {
        if (!selectedSeeker) {
            return [0, 0, 0];
        }
        const next = selectedSeeker.location.find((l) => l.key == 1);
        if (!next) {
            console.warn('no next location found for seeker');
            return [0, 0, 0];
        }
        return getCoords(next.tile.keys);
    };

    const selectedSeekerIsOnTile = selectedSeeker ? tileDistance(selectedTile, getCurrentSeekerLocation()) == 0 : false;
    const selectedTileHasBuildingOfExpectedKind = (() => {
        if (!data?.extension) {
            return false;
        }
        if (!selectedBuilding) {
            return false;
        }
        return getAddress(selectedBuilding.kind?.addr) === getAddress(data.extension.id);
    })();

    if (queryError) {
        return <Text>query fail {queryError.toString()}</Text>;
    } else if (!data?.extension) {
        return <Text>failed to find extension for {extID}</Text>;
    } else if (!hasSignedIn) {
        return <Auth gameID={data.extension.name} />;
    }

    const body = (() => {
        if (!data.extension) {
            // failed to find any deployed extension with the expected name
            return (
                <CardBody>
                    <Alert status="error" variant="solid">
                        <AlertIcon />
                        No deployed extension with id: {extID}
                    </Alert>
                </CardBody>
            );
        } else if (!selectedTile) {
            // player has not selected a tile yet
            return (
                <CardBody>
                    <Text>Select a tile with a {data.extension.name} building on it to see who has visited</Text>
                    <Alert status="info" variant="solid">
                        <AlertIcon />
                        No tile selected
                    </Alert>
                </CardBody>
            );
        } else if (!selectedSeeker) {
            // we don't know who the seeker is
            return (
                <CardBody>
                    <Text>Select a tile with a {data.extension.name} building on it to see who has visited</Text>
                    <Alert status="info" variant="solid">
                        <AlertIcon />
                        No active seeker
                    </Alert>
                </CardBody>
            );
        } else if (!selectedTileHasBuildingOfExpectedKind) {
            // the selected tile is not one we care about
            return (
                <CardBody>
                    <Text>Select a tile with a {data.extension.name} building on it to see who has visited</Text>
                    <Alert status="info" variant="solid">
                        <AlertIcon />
                        Selected tile is not a {data.extension.name}
                    </Alert>
                </CardBody>
            );
        } else {
            // the selected tile is one of our buildings so show something interesting
            const note = selectedSeekerIsOnTile ? (
                <Text>Welcome to {data.extension.name}, click check-in to register your visit</Text>
            ) : (
                <Text>Move your seeker onto the tile to enable check-in</Text>
            );
            const listOfCheckedIn = data.extension.state.seekers
                .filter((s) => s?.building?.id == selectedBuilding?.id)
                .map((s) => (
                    <ListItem key={s.seekerID}>
                        <ListIcon as={CheckCircleIcon} color="green.500" />
                        {s.seekerID}
                    </ListItem>
                ));
            console.log('selectedBuilding', selectedBuilding);
            const seekerCheckedIn = data.extension.state.seekers.find(
                (s) => s.building?.id == selectedBuilding?.id && selectedSeeker.id == s?.seekerID
            );
            const checkinButton = !seekerCheckedIn ? (
                <Button
                    isDisabled={!selectedSeekerIsOnTile}
                    variant="outline"
                    colorScheme="blue"
                    onClick={handleClickCheckin}
                >
                    Check In
                </Button>
            ) : null;
            return (
                <Card>
                    <CardBody>
                        <Text>{note}</Text>
                        <List>{listOfCheckedIn}</List>
                        <ButtonGroup spacing="2">{checkinButton}</ButtonGroup>
                    </CardBody>
                </Card>
            );
        }
    })();

    return (
        <StyledPlugin>
            <Card>
                <CardHeader>
                    <Heading size="md">{data.extension.name}</Heading>
                </CardHeader>
                {body}
            </Card>
        </StyledPlugin>
    );
};
