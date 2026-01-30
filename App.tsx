import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import WebView from 'react-native-webview';

const localHtml: number = require('./assets/papergrapher/index.html');

function LoadingScreen() {
    return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" />
        </View>
    );
}

export default function App() {
    const [webUri, setWebUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        let isMounted = true;

        const resolveWebAsset = async () => {
            try {
                const asset = Asset.fromModule(localHtml);
                await asset.downloadAsync();
                if (!isMounted) return;
                setWebUri(asset?.uri ?? asset?.localUri ?? null);
            } catch (error) {
                console.warn('Failed to resolve Papergrapher HTML for web', error);
                if (isMounted) setWebUri(null);
            }
        };

        resolveWebAsset();

        return () => {
            isMounted = false;
        };
    }, []);

    if (Platform.OS === 'web') {
        if (!webUri) {
            return <LoadingScreen />;
        }

        return (
            <View style={styles.container}>
                <iframe
                    src={webUri}
                    title="Papergrapher"
                    style={styles.iframe}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            </View>
        );
    }

    return (
        <WebView
            originWhitelist={['*']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            source={localHtml as any}
            style={styles.webView}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111111'
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111111'
    },
    iframe: {
        border: 'none',
        width: '100%',
        height: '100%'
    },
    webView: {
        flex: 1,
        backgroundColor: '#111111'
    }
});
