import React, { useMemo, useRef, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import WebView from 'react-native-webview';
import { papergrapherHtml } from './papergrapherHtml';

const IFrame: any = 'iframe';
const WEB_SANDBOX =
    'allow-scripts allow-forms allow-modals allow-popups allow-downloads';

type CommandPayload = {
    type: 'pg:command';
    action: string;
    toolId?: string;
    color?: string | null;
    value?: number | null;
};

const TOOL_LIST = [
    { id: 'select', label: 'Item' },
    { id: 'detailselect', label: 'Details' },
    { id: 'draw', label: 'Draw' },
    { id: 'bezier', label: 'Bezier' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'broadbrush', label: 'Broad' },
    { id: 'text', label: 'Text' },
    { id: 'eyedropper', label: 'Eye' },
    { id: 'circle', label: 'Circle' },
    { id: 'rectangle', label: 'Rect' },
    { id: 'rotate', label: 'Rotate' },
    { id: 'scale', label: 'Scale' },
    { id: 'exportrect', label: 'Export' },
    { id: 'zoom', label: 'Zoom' }
];

const COLOR_SWATCHES = [
    '#000000',
    '#ffffff',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#00ffff',
    '#ff00ff',
    '#888888'
];

const BLEND_MODES = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'soft-light',
    'hard-light',
    'color-dodge',
    'color-burn',
    'darken',
    'lighten',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'luminosity',
    'color',
    'add',
    'subtract',
    'average',
    'pin-light',
    'negation',
    'source-over',
    'source-in',
    'source-atop',
    'destination-over',
    'destination-in',
    'destination-out',
    'destination-atop',
    'lighter',
    'darker',
    'copy',
    'xor'
];

const MENU_SECTIONS = [
    {
        title: 'Burger Menu',
        actions: [
            { label: 'New', action: 'newDocument' },
            { label: 'Open', action: 'openJson' },
            { label: 'Save', action: 'saveDocument' },
            { label: 'Undo', action: 'undo' },
            { label: 'Redo', action: 'redo' },
            { label: 'Import Image', action: 'importImage' },
            { label: 'Import SVG', action: 'importSvg' },
            { label: 'Import Image URL', action: 'importImageUrl' },
            { label: 'Import SVG URL', action: 'importSvgUrl' },
            { label: 'Export PNG', action: 'exportImage' },
            { label: 'Export SVG', action: 'exportSvg' },
            { label: 'Layers', action: 'toggleLayerPanel' },
            { label: 'Script Editor', action: 'toggleScriptEditor' },
            { label: 'View: Zoom In', action: 'zoomIn' },
            { label: 'View: Zoom Out', action: 'zoomOut' },
            { label: 'View: Reset Zoom', action: 'resetZoom' },
            { label: 'View: Reset Pan', action: 'resetPan' },
            { label: 'Reset Settings', action: 'resetSettings' },
            { label: 'About', action: 'showAbout' }
        ]
    },
    {
        title: 'Edit',
        actions: [
            { label: 'Copy', action: 'copy' },
            { label: 'Paste', action: 'paste' },
            { label: 'Delete', action: 'deleteSelection' }
        ]
    },
    {
        title: 'Select',
        actions: [
            { label: 'Select All', action: 'selectAll' },
            { label: 'Deselect All', action: 'deselectAll' },
            { label: 'Invert Selection', action: 'invertSelection' },
            { label: 'Random Selection', action: 'randomSelection' },
            { label: 'Select All Segments', action: 'selectAllSegments' },
            { label: 'Invert Segments', action: 'invertSegments' }
        ]
    },
    {
        title: 'Group',
        actions: [
            { label: 'Group', action: 'groupSelection' },
            { label: 'Ungroup', action: 'ungroupSelection' }
        ]
    },
    {
        title: 'Layer',
        actions: [{ label: 'Move to Active Layer', action: 'moveToActiveLayer' }]
    },
    {
        title: 'Order',
        actions: [
            { label: 'Bring to Front', action: 'bringToFront' },
            { label: 'Send to Back', action: 'sendToBack' }
        ]
    },
    {
        title: 'Compound Path',
        actions: [
            { label: 'Create Compound Path', action: 'compoundCreate' },
            { label: 'Release Compound Path', action: 'compoundRelease' }
        ]
    },
    {
        title: 'Boolean Operations',
        actions: [
            { label: 'Unite', action: 'booleanUnite' },
            { label: 'Intersect', action: 'booleanIntersect' },
            { label: 'Subtract', action: 'booleanSubtract' },
            { label: 'Exclude', action: 'booleanExclude' },
            { label: 'Divide', action: 'booleanDivide' }
        ]
    },
    {
        title: 'Text',
        actions: [{ label: 'Text to Outlines', action: 'textToOutlines' }]
    }
];

export default function PapergrapherEmbed() {
    const webViewRef = useRef<WebView>(null);
    const iframeRef = useRef<any>(null);
    const [activeTool, setActiveTool] = useState('select');
    const [fillColor, setFillColor] = useState('#000000');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState('1');
    const [opacity, setOpacity] = useState('1');
    const [colorTarget, setColorTarget] = useState<'fill' | 'stroke'>('fill');
    const [menuOpen, setMenuOpen] = useState(false);
    const [blendOpen, setBlendOpen] = useState(false);
    const [blendMode, setBlendMode] = useState('normal');

    const sendCommand = (payload: CommandPayload) => {
        const message = JSON.stringify(payload);
        if (Platform.OS === 'web') {
            iframeRef.current?.contentWindow?.postMessage(message, '*');
        } else {
            webViewRef.current?.postMessage(message);
        }
    };

    const setTool = (toolId: string) => {
        setActiveTool(toolId);
        sendCommand({ type: 'pg:command', action: 'tool', toolId });
    };

    const runAction = (action: string) => {
        sendCommand({ type: 'pg:command', action });
    };

    const applyColor = (hex: string) => {
        if (colorTarget === 'fill') {
            setFillColor(hex);
            sendCommand({ type: 'pg:command', action: 'fillColor', color: hex });
        } else {
            setStrokeColor(hex);
            sendCommand({ type: 'pg:command', action: 'strokeColor', color: hex });
        }
    };

    const adjustStrokeWidth = (delta: number) => {
        const current = parseFloat(strokeWidth) || 0;
        const next = Math.max(0, current + delta);
        setStrokeWidth(String(next));
        sendCommand({ type: 'pg:command', action: 'strokeWidth', value: next });
    };

    const commitStrokeWidth = () => {
        const value = Math.max(0, parseFloat(strokeWidth) || 0);
        setStrokeWidth(String(value));
        sendCommand({ type: 'pg:command', action: 'strokeWidth', value });
    };

    const commitOpacity = () => {
        const value = Math.min(1, Math.max(0, parseFloat(opacity) || 1));
        setOpacity(String(value));
        sendCommand({ type: 'pg:command', action: 'opacity', value });
    };

    const applyBlendMode = (mode: string) => {
        setBlendMode(mode);
        setBlendOpen(false);
        sendCommand({ type: 'pg:command', action: 'blendMode', value: mode });
    };

    const fillIndicator = useMemo(() => ({ backgroundColor: fillColor || '#000000' }), [fillColor]);
    const strokeIndicator = useMemo(() => ({ borderColor: strokeColor || '#000000' }), [strokeColor]);
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
        <View style={styles.container}>
            {Platform.OS === 'web' ? (
                <IFrame
                    ref={iframeRef}
                    srcDoc={papergrapherHtml}
                    title="Papergrapher"
                    style={styles.iframe}
                    sandbox={WEB_SANDBOX}
                    allow="clipboard-read; clipboard-write; fullscreen"
                />
            ) : (
                <WebView
                    ref={webViewRef}
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
            )}

            <View style={styles.topBar}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuOpen(true)}
                >
                    <Text style={styles.menuLabel}>Menu</Text>
                </TouchableOpacity>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TOOL_LIST.map((tool) => (
                        <TouchableOpacity
                            key={tool.id}
                            style={[
                                styles.toolButton,
                                activeTool === tool.id && styles.toolButtonActive
                            ]}
                            onPress={() => setTool(tool.id)}
                        >
                            <Text
                                style={[
                                    styles.toolLabel,
                                    activeTool === tool.id && styles.toolLabelActive
                                ]}
                            >
                                {tool.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.bottomBar}>
                <View style={styles.colorRow}>
                    <TouchableOpacity
                        style={[
                            styles.colorTarget,
                            colorTarget === 'fill' && styles.colorTargetActive
                        ]}
                        onPress={() => setColorTarget('fill')}
                    >
                        <View style={[styles.fillIndicator, fillIndicator]} />
                        <Text style={styles.colorTargetLabel}>Fill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.colorTarget,
                            colorTarget === 'stroke' && styles.colorTargetActive
                        ]}
                        onPress={() => setColorTarget('stroke')}
                    >
                        <View style={[styles.strokeIndicator, strokeIndicator]} />
                        <Text style={styles.colorTargetLabel}>Stroke</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.swapButton}
                        onPress={() => sendCommand({ type: 'pg:command', action: 'switchColors' })}
                    >
                        <Text style={styles.swapLabel}>Swap</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.swatchRow}>
                    {COLOR_SWATCHES.map((hex) => (
                        <TouchableOpacity
                            key={hex}
                            style={[styles.swatch, { backgroundColor: hex }]}
                            onPress={() => applyColor(hex)}
                        />
                    ))}
                </ScrollView>

                <View style={styles.controlRow}>
                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Stroke</Text>
                        <View style={styles.controlInline}>
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => adjustStrokeWidth(-1)}
                            >
                                <Text style={styles.adjustLabel}>-</Text>
                            </TouchableOpacity>
                            <TextInput
                                value={strokeWidth}
                                onChangeText={setStrokeWidth}
                                onBlur={commitStrokeWidth}
                                keyboardType="numeric"
                                style={styles.controlInput}
                            />
                            <TouchableOpacity
                                style={styles.adjustButton}
                                onPress={() => adjustStrokeWidth(1)}
                            >
                                <Text style={styles.adjustLabel}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Opacity</Text>
                        <TextInput
                            value={opacity}
                            onChangeText={setOpacity}
                            onBlur={commitOpacity}
                            keyboardType="numeric"
                            style={styles.controlInput}
                        />
                    </View>
                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Blending</Text>
                        <TouchableOpacity
                            style={styles.blendButton}
                            onPress={() => setBlendOpen(true)}
                        >
                            <Text style={styles.blendLabel}>{blendMode}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.controlGroup}>
                        <Text style={styles.controlLabel}>Actions</Text>
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => sendCommand({ type: 'pg:command', action: 'undo' })}
                            >
                                <Text style={styles.actionLabel}>Undo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => sendCommand({ type: 'pg:command', action: 'redo' })}
                            >
                                <Text style={styles.actionLabel}>Redo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => sendCommand({ type: 'pg:command', action: 'exportImage' })}
                            >
                                <Text style={styles.actionLabel}>Export PNG</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.zoomPad}>
                <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => runAction('zoomIn')}
                >
                    <Text style={styles.zoomLabel}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => runAction('zoomOut')}
                >
                    <Text style={styles.zoomLabel}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => runAction('resetZoom')}
                >
                    <Text style={styles.zoomLabel}>Reset</Text>
                </TouchableOpacity>
            </View>

            {menuOpen && (
                <View style={styles.menuOverlay}>
                    <View style={styles.menuPanel}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuTitle}>Navigation</Text>
                            <TouchableOpacity onPress={() => setMenuOpen(false)}>
                                <Text style={styles.menuClose}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {MENU_SECTIONS.map((section) => (
                                <View key={section.title} style={styles.menuSection}>
                                    <Text style={styles.menuSectionTitle}>{section.title}</Text>
                                    <View style={styles.menuActions}>
                                        {section.actions.map((item) => (
                                            <TouchableOpacity
                                                key={item.label}
                                                style={styles.menuAction}
                                                onPress={() => runAction(item.action)}
                                            >
                                                <Text style={styles.menuActionLabel}>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {blendOpen && (
                <View style={styles.menuOverlay}>
                    <View style={styles.blendPanel}>
                        <View style={styles.menuHeader}>
                            <Text style={styles.menuTitle}>Blend Mode</Text>
                            <TouchableOpacity onPress={() => setBlendOpen(false)}>
                                <Text style={styles.menuClose}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {BLEND_MODES.map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={styles.menuAction}
                                    onPress={() => applyBlendMode(mode)}
                                >
                                    <Text style={styles.menuActionLabel}>{mode}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
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
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        alignItems: 'center'
    },
    menuButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: '#111111',
        marginRight: 10
    },
    menuLabel: {
        color: '#ffffff',
        fontSize: 12
    },
    toolButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: '#f2f2f2',
        marginRight: 8
    },
    toolButtonActive: {
        backgroundColor: '#111111'
    },
    toolLabel: {
        fontSize: 12,
        color: '#111111'
    },
    toolLabelActive: {
        color: '#ffffff'
    },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    colorTarget: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        marginRight: 8
    },
    colorTargetActive: {
        borderColor: '#111111'
    },
    fillIndicator: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: 6
    },
    strokeIndicator: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        marginRight: 6,
        backgroundColor: '#ffffff'
    },
    colorTargetLabel: {
        fontSize: 12,
        color: '#111111'
    },
    swapButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: '#111111'
    },
    swapLabel: {
        fontSize: 12,
        color: '#ffffff'
    },
    swatchRow: {
        marginBottom: 8
    },
    swatch: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: '#dddddd',
        marginRight: 8
    },
    controlRow: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    controlGroup: {
        marginRight: 16,
        marginBottom: 8
    },
    controlLabel: {
        fontSize: 11,
        color: '#666666',
        marginBottom: 4
    },
    controlInline: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    blendButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#f0f0f0'
    },
    blendLabel: {
        fontSize: 11,
        color: '#111111'
    },
    controlInput: {
        width: 48,
        height: 28,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        borderRadius: 6,
        paddingHorizontal: 6,
        fontSize: 12,
        marginHorizontal: 6,
        textAlign: 'center'
    },
    adjustButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#111111',
        alignItems: 'center',
        justifyContent: 'center'
    },
    adjustLabel: {
        color: '#ffffff',
        fontSize: 14,
        lineHeight: 16
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        marginRight: 6
    },
    actionLabel: {
        fontSize: 11,
        color: '#111111'
    },
    zoomPad: {
        position: 'absolute',
        right: 10,
        bottom: 120,
        alignItems: 'center'
    },
    zoomButton: {
        width: 54,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#111111',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6
    },
    zoomLabel: {
        color: '#ffffff',
        fontSize: 12
    },
    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    menuPanel: {
        width: '100%',
        maxHeight: '80%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16
    },
    blendPanel: {
        width: '100%',
        maxHeight: '70%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16
    },
    menuHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111111'
    },
    menuClose: {
        fontSize: 12,
        color: '#111111'
    },
    menuSection: {
        marginBottom: 14
    },
    menuSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444444',
        marginBottom: 6
    },
    menuActions: {
        flexDirection: 'row',
        flexWrap: 'wrap'
    },
    menuAction: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: '#f3f3f3',
        marginRight: 6,
        marginBottom: 6
    },
    menuActionLabel: {
        fontSize: 11,
        color: '#111111'
    }
});
