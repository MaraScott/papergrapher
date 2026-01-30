import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Share, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
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
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            </View>
        );
    }

    const handleWebViewMessage = async (event: { nativeEvent: { data: string } }) => {
        try {
            const message = JSON.parse(event.nativeEvent.data || '{}');
            if (!message || !message.type || !message.dataUrl) return;

            const isSvg = message.type === 'export:svg';
            const isImage = message.type === 'export:image';
            const base64 = String(message.dataUrl).split(',')[1] || '';
            if (!base64) return;

            const fileName = String(message.fileName || (isSvg ? 'export.svg' : 'export.png'));
            const sanitizedName = fileName.replace(/[^a-z0-9._-]/gi, '_');
            const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
            const fileUri = `${directory}${sanitizedName}`;

            await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType?.Base64 || 'base64'
            });

            if (isImage) {
                const permission = await MediaLibrary.requestPermissionsAsync();
                if (permission.status === 'granted') {
                    const asset = await MediaLibrary.createAssetAsync(fileUri);
                    try {
                        await MediaLibrary.createAlbumAsync('Papergrapher', asset, false);
                    } catch (error) {
                        // Album may already exist or fail silently; asset still saved.
                    }
                    Alert.alert('Saved', 'Image saved to Photos.');
                    return;
                }
            }

            const shareUri =
                Platform.OS === 'android'
                    ? await FileSystem.getContentUriAsync(fileUri)
                    : fileUri;

            await Share.share(
                {
                    title: 'Share export',
                    url: shareUri,
                    message: Platform.OS === 'android' ? shareUri : undefined
                },
                {
                    dialogTitle: 'Share export'
                }
            );
        } catch (error) {
            console.warn('Failed to handle export message', error);
        }
    };

    return (
        <WebView
            originWhitelist={['*']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            source={localHtml as any}
            style={styles.webView}
            onMessage={handleWebViewMessage}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff'
    },
    iframe: {
        border: 'none',
        width: '100%',
        height: '100%'
    },
    webView: {
        flex: 1,
        backgroundColor: '#ffffff'
    }
});
