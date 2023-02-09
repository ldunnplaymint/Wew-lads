/** @format */

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { useRouter } from 'next/router';
import { Anchor } from '@app/types/anchor';
import Head from 'next/head';
import { CogPluginProvider } from '@app/contexts/cog-plugin-provider';
import { COGSessionProvider } from '@app/contexts/cog-session-provider';
import { NetworkProvider } from '@app/contexts/network-provider';
import { Web3Provider } from '@app/contexts/web3-provider';
import { Plugin } from '@app/components/views/plugin';
import { ethers } from 'ethers';

const client = new ApolloClient({
    uri: 'http://localhost:8080/query',
    cache: new InMemoryCache()
});

export default function PluginPage() {
    const router = useRouter();
    const id = router.query.id as string;

    const actions = new ethers.utils.Interface([`function CHECK_IN(bytes24 seekerID, bytes24 buildingID)`]);

    return (
        <ApolloProvider client={client}>
            <CogPluginProvider>
                <Web3Provider>
                    <NetworkProvider>
                        <COGSessionProvider actions={actions}>
                            <Head>
                                <title>Example plugin</title>
                                <meta property="og:title" content="Example plugin" key="title" />
                            </Head>
                            <Plugin width={300} height={200} anchor={Anchor.TopLeft} id={id} />
                        </COGSessionProvider>
                    </NetworkProvider>
                </Web3Provider>
            </CogPluginProvider>
        </ApolloProvider>
    );
}
