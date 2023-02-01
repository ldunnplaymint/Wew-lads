/** @format */

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { Fragment } from 'react';
import Head from 'next/head';
import { CogPluginProvider } from '@app/contexts/cog-plugin-provider';
import { ethers } from 'ethers';

export default function HomePage() {
    const client = new ApolloClient({
        uri: 'http://localhost:8080/query',
        cache: new InMemoryCache()
    });

    const actions = new ethers.utils.Interface(['function CHECK_IN(bytes24 seekerID, bytes24 buildingID) external;']);

    return (
        <Fragment>
            <Head>
                <title>Leaderboard plugin</title>
                <meta property="og:title" content="Leaderboard plugin" key="title" />
            </Head>
            <ApolloProvider client={client}>
                <CogPluginProvider gameID="DAWNSEEKERS" actions={actions}>
                    pluginy
                </CogPluginProvider>
            </ApolloProvider>
        </Fragment>
    );
}
