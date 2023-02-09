/** @format */

import { Fragment } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import Head from 'next/head';
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { GlobalStyles } from '@app/styles/global.styles';

function App({ Component, pageProps }: any) {
    const config: ThemeConfig = {
        useSystemColorMode: false,
        initialColorMode: 'dark'
    };
    const theme = extendTheme({ config });
    return (
        <Fragment>
            <Head>
                <title>Example Client Plugin</title>
                <meta name="description" content="Example Dawnseekers Client Plugin" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <GlobalStyles />
            <ChakraProvider theme={theme}>
                <Component {...pageProps} />
            </ChakraProvider>
        </Fragment>
    );
}

export default App;
