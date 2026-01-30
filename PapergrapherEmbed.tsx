import React from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import WebView from 'react-native-webview';
import { papergrapherHtml } from './papergrapherHtml';

const IFrame: any = 'iframe';
const WEB_SANDBOX =
    'allow-scripts allow-forms allow-modals allow-popups allow-downloads';

export default function PapergrapherEmbed() {
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

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <IFrame
                    srcDoc={papergrapherHtml}
                    title="Papergrapher"
                    style={styles.iframe}
                    sandbox={WEB_SANDBOX}
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
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            source={{ html: papergrapherHtml }}
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
