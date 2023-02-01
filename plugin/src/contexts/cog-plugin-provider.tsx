/** @format */

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Anchor } from '@app/types/anchor';
import { Interface } from 'ethers/lib/utils';

export interface CogPluginContextProviderProps {
    children?: ReactNode;
    gameID: string;
    actions?: Interface;
}

export interface CogPluginContextStore {
    isReady: boolean;
    registerPlugin: (width: number, height: number, anchor: Anchor) => void;
    dispatch: (actionName: string, ...actionArgs: any) => void;
    openModal: (url: string) => void;
    closeModal: () => void;
}

export const CogPluginContext = createContext<CogPluginContextStore>({} as CogPluginContextStore);

export const useCogPlugin = () => useContext(CogPluginContext);

export const CogPluginProvider = ({ children, gameID, actions }: CogPluginContextProviderProps) => {
    const [isReady, setIsReady] = useState<boolean>(false);

    const registerPlugin = (width: number, height: number, anchor: Anchor) => {
        // todo handle being the top level window
        if (!window.top) return;

        // todo use the full url not just the path
        const url = window.location.pathname;
        console.log('Register plugin', url);

        window.top.postMessage(
            {
                method: 'registerPlugin',
                args: {
                    url,
                    width,
                    height,
                    anchor,
                    x: 0,
                    y: 0
                }
            },
            '*'
        );
    };

    const dispatch = (actionName: string, ...actionArgs: any) => {
        // todo handle being the top level window
        if (!window.top) return;
        if (!actions) return;

        // todo use the full url not just the path
        const url = window.location.pathname;
        const action = actions.encodeFunctionData(actionName, actionArgs);
        console.log(`CogPluginProvider.dispatch: gameID: ${gameID} actionName: ${actionName} action: ${action}`);

        window.top.postMessage(
            {
                method: 'dispatch',
                args: {
                    url,
                    gameID,
                    action
                }
            },
            '*'
        );
    };

    const openModal = (url: string) => {
        if (!window.top) return;
        window.top.postMessage(
            {
                method: 'openModal',
                args: {
                    url
                }
            },
            '*'
        );
    };

    const closeModal = () => {
        if (!window.top) return;
        window.top.postMessage(
            {
                method: 'closeModal'
            },
            '*'
        );
    };

    useEffect(() => {
        const handleMessage = (event: any) => {
            const { method } = event.data;
            if (method == 'ready') {
                console.log('Ready', window.location.pathname.replace(/\/+$/, ''));
                setIsReady(true);
            }
        };

        // wait for message from parent to say ready
        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const store: CogPluginContextStore = {
        isReady,
        registerPlugin,
        dispatch,
        openModal,
        closeModal
    };
    return <CogPluginContext.Provider value={store}>{children}</CogPluginContext.Provider>;
};
