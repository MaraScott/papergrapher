import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ImageSourcePropType,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
    findNodeHandle
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import WebView from 'react-native-webview';
import { papergrapherHtml } from './papergrapherHtml';

const IFrame: any = 'iframe';
const WEB_SANDBOX =
    'allow-scripts allow-forms allow-modals allow-popups allow-downloads';

const TOP_BAR_HEIGHT = 30;
const SIDE_BAR_WIDTH = 76;
const TRANSPARENT = 'transparent';
const SWITCH_ICON = require('./assets/icons/icon_switchColor.png');
const TRANSPARENT_BG = require('./assets/icons/transparent_bg.png');
const WebColorInput: any = 'input';
const WebFileInput: any = 'input';
const MENU_WIDTH = 240;
const MENU_MAX_HEIGHT = 320;
const MENU_MARGIN = 8;

type CommandPayload = {
    type: 'pg:command';
    action: string;
    toolId?: string;
    color?: string | null;
    value?: number | null;
    dataUrl?: string | null;
    svgString?: string | null;
    jsonString?: string | null;
};

type Anchor = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type MenuAction = { label: string; action: string };

type MenuSection = {
    title: string;
    actions: MenuAction[];
};

const TOOL_ICON_MAP: Record<string, ImageSourcePropType> = {
    select: require('./assets/icons/tool_select.png'),
    detailselect: require('./assets/icons/tool_detailselect.png'),
    draw: require('./assets/icons/tool_draw.png'),
    bezier: require('./assets/icons/tool_bezier.png'),
    cloud: require('./assets/icons/tool_cloud.png'),
    broadbrush: require('./assets/icons/tool_broadbrush.png'),
    text: require('./assets/icons/tool_text.png'),
    eyedropper: require('./assets/icons/tool_eyedropper.png'),
    circle: require('./assets/icons/tool_circle.png'),
    rectangle: require('./assets/icons/tool_rectangle.png'),
    rotate: require('./assets/icons/tool_rotate.png'),
    scale: require('./assets/icons/tool_scale.png'),
    exportrect: require('./assets/icons/tool_exportrect.png'),
    zoom: require('./assets/icons/tool_zoom.png'),
    viewgrab: require('./assets/icons/tool_viewgrab.png')
};

const TOOL_SIDEBAR = [
    { id: 'select', label: 'Item', icon: TOOL_ICON_MAP.select },
    { id: 'detailselect', label: 'Detail', icon: TOOL_ICON_MAP.detailselect },
    { id: 'draw', label: 'Draw', icon: TOOL_ICON_MAP.draw },
    { id: 'bezier', label: 'Bezier', icon: TOOL_ICON_MAP.bezier },
    { id: 'cloud', label: 'Cloud', icon: TOOL_ICON_MAP.cloud },
    { id: 'broadbrush', label: 'Brush', icon: TOOL_ICON_MAP.broadbrush },
    { id: 'text', label: 'Text', icon: TOOL_ICON_MAP.text },
    { id: 'eyedropper', label: 'Eye', icon: TOOL_ICON_MAP.eyedropper },
    { id: 'circle', label: 'Circle', icon: TOOL_ICON_MAP.circle },
    { id: 'rectangle', label: 'Rect', icon: TOOL_ICON_MAP.rectangle },
    { id: 'rotate', label: 'Rotate', icon: TOOL_ICON_MAP.rotate },
    { id: 'scale', label: 'Scale', icon: TOOL_ICON_MAP.scale },
    { id: 'exportrect', label: 'Export', icon: TOOL_ICON_MAP.exportrect },
    { id: 'viewgrab', label: 'Hand', icon: TOOL_ICON_MAP.viewgrab },
    { id: 'zoom', label: 'Zoom', icon: TOOL_ICON_MAP.zoom }
];

const COLOR_SWATCHES = [
    { label: 'Transparent', value: null },
    { label: 'Black', value: '#000000' },
    { label: 'White', value: '#ffffff' },
    { label: 'Red', value: '#ff0000' },
    { label: 'Green', value: '#00ff00' },
    { label: 'Blue', value: '#0000ff' },
    { label: 'Yellow', value: '#ffff00' },
    { label: 'Cyan', value: '#00ffff' },
    { label: 'Magenta', value: '#ff00ff' },
    { label: 'Gray', value: '#888888' }
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

const OPACITY_OPTIONS = ['100', '90', '80', '70', '60', '50', '40', '30', '20', '10', '0'];
const ZOOM_OPTIONS = ['10', '20', '50', '100', '150', '200', '300', '500', '1000'];

const BURGER_MENU: MenuSection = {
    title: 'Menu',
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
};

const TOOL_MENU_SECTIONS: MenuSection[] = [
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
        title: 'Compound path',
        actions: [
            { label: 'Create Compound Path', action: 'compoundCreate' },
            { label: 'Release Compound Path', action: 'compoundRelease' }
        ]
    },
    {
        title: 'Boolean operations',
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
        actions: [{ label: 'Text to outlines', action: 'textToOutlines' }]
    }
];

export default function PapergrapherEmbed() {
    const webViewRef = useRef<WebView>(null);
    const iframeRef = useRef<any>(null);
    const opacityRef = useRef<any>(null);
    const blendRef = useRef<any>(null);
    const zoomRef = useRef<any>(null);
    const colorStackRef = useRef<any>(null);
    const burgerRef = useRef<any>(null);
    const toolMenuRef = useRef<any>(null);
    const webImageInputRef = useRef<any>(null);
    const webSvgInputRef = useRef<any>(null);
    const webJsonInputRef = useRef<any>(null);
    const [activeTool, setActiveTool] = useState('select');
    const [fillColor, setFillColor] = useState<string>(TRANSPARENT);
    const [strokeColor, setStrokeColor] = useState<string>('#000000');
    const [strokeWidth, setStrokeWidth] = useState('1');
    const [opacityPercent, setOpacityPercent] = useState('100');
    const [colorTarget, setColorTarget] = useState<'fill' | 'stroke'>('fill');
    const [colorOpen, setColorOpen] = useState(false);
    const [colorDraft, setColorDraft] = useState<string>(TRANSPARENT);
    const [menuOpen, setMenuOpen] = useState(false);
    const [toolMenuOpen, setToolMenuOpen] = useState(false);
    const [blendOpen, setBlendOpen] = useState(false);
    const [blendMode, setBlendMode] = useState('normal');
    const [opacityOpen, setOpacityOpen] = useState(false);
    const [zoomOpen, setZoomOpen] = useState(false);
    const [zoomPercent, setZoomPercent] = useState('100');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [opacityAnchor, setOpacityAnchor] = useState<Anchor | null>(null);
    const [blendAnchor, setBlendAnchor] = useState<Anchor | null>(null);
    const [zoomAnchor, setZoomAnchor] = useState<Anchor | null>(null);
    const [colorAnchor, setColorAnchor] = useState<Anchor | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<Anchor | null>(null);
    const [toolMenuAnchor, setToolMenuAnchor] = useState<Anchor | null>(null);

    const sendCommand = (payload: CommandPayload) => {
        const message = JSON.stringify(payload);
        if (Platform.OS === 'web') {
            iframeRef.current?.contentWindow?.postMessage(message, '*');
        } else {
            webViewRef.current?.postMessage(message);
        }
    };

    useEffect(() => {
        sendCommand({ type: 'pg:command', action: 'fillColor', color: null });
        sendCommand({ type: 'pg:command', action: 'strokeColor', color: '#000000' });
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) return;
            const target = event.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }
            if (event.code === 'Space' || event.key === ' ') {
                event.preventDefault();
                sendCommand({ type: 'pg:command', action: 'panStart' });
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }
            if (event.code === 'Space' || event.key === ' ') {
                event.preventDefault();
                sendCommand({ type: 'pg:command', action: 'panEnd' });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const measureAnchor = (ref: React.RefObject<any>, setter: (value: Anchor | null) => void) => {
        try {
            if (Platform.OS === 'web') {
                const element = ref.current as HTMLElement | null;
                if (element && typeof element.getBoundingClientRect === 'function') {
                    const rect = element.getBoundingClientRect();
                    setter({
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    });
                    return;
                }
            }
            const handle = ref.current ? findNodeHandle(ref.current) : null;
            if (!handle || typeof UIManager.measureInWindow !== 'function') {
                setter(null);
                return;
            }
            UIManager.measureInWindow(handle, (x, y, width, height) => {
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    setter({ x, y, width, height });
                } else {
                    setter(null);
                }
            });
        } catch (error) {
            setter(null);
        }
    };

    const getMenuPosition = (anchor: Anchor | null) => {
        if (!anchor) return null;
        const { width: winW, height: winH } = Dimensions.get('window');
        const preferRight = anchor.x < winW / 2;
        const left = preferRight
            ? Math.min(anchor.x + anchor.width + MENU_MARGIN, winW - MENU_WIDTH - MENU_MARGIN)
            : Math.max(
                  MENU_MARGIN,
                  Math.min(anchor.x + anchor.width - MENU_WIDTH, winW - MENU_WIDTH - MENU_MARGIN)
              );
        const top = Math.min(
            Math.max(anchor.y - 6, MENU_MARGIN),
            winH - MENU_MAX_HEIGHT - MENU_MARGIN
        );
        return { left, top };
    };

    const getMenuBelowAnchor = (anchor: Anchor | null) => {
        if (!anchor) return null;
        const { width: winW, height: winH } = Dimensions.get('window');
        const left = Math.min(
            Math.max(MENU_MARGIN, anchor.x),
            winW - MENU_WIDTH - MENU_MARGIN
        );
        const top = Math.min(
            Math.max(anchor.y + anchor.height + 4, MENU_MARGIN),
            winH - MENU_MAX_HEIGHT - MENU_MARGIN
        );
        return { left, top };
    };

    const setTool = (toolId: string) => {
        setActiveTool(toolId);
        sendCommand({ type: 'pg:command', action: 'tool', toolId });
    };

    const handleNativeImport = async (action: string) => {
        try {
            if (action === 'importImage') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['image/*'],
                    copyToCacheDirectory: true
                });
                if (result.canceled || !result.assets || !result.assets[0]) return;
                const asset = result.assets[0];
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType?.Base64 || 'base64'
                });
                if (!base64) return;
                const mimeType = asset.mimeType || 'image/png';
                const dataUrl = `data:${mimeType};base64,${base64}`;
                sendCommand({ type: 'pg:command', action: 'importImageData', dataUrl });
                return;
            }

            if (action === 'importSvg') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['image/svg+xml', 'text/xml', 'application/xml'],
                    copyToCacheDirectory: true
                });
                if (result.canceled || !result.assets || !result.assets[0]) return;
                const asset = result.assets[0];
                const svgString = await FileSystem.readAsStringAsync(asset.uri);
                if (!svgString) return;
                sendCommand({ type: 'pg:command', action: 'importSvgString', svgString });
                return;
            }

            if (action === 'openJson') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/json', 'text/json', 'text/plain'],
                    copyToCacheDirectory: true
                });
                if (result.canceled || !result.assets || !result.assets[0]) return;
                const asset = result.assets[0];
                const jsonString = await FileSystem.readAsStringAsync(asset.uri);
                if (!jsonString) return;
                sendCommand({ type: 'pg:command', action: 'importJsonString', jsonString });
                return;
            }
        } catch (error) {
            console.warn('Import failed', error);
        }
    };

    const handleWebFile = (file: File, action: 'importImage' | 'importSvg' | 'openJson') => {
        const reader = new FileReader();
        if (action === 'importImage') {
            reader.onload = () => {
                const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                if (dataUrl) {
                    sendCommand({ type: 'pg:command', action: 'importImageData', dataUrl });
                }
            };
            reader.readAsDataURL(file);
            return;
        }
        reader.onload = () => {
            const text = typeof reader.result === 'string' ? reader.result : '';
            if (!text) return;
            if (action === 'importSvg') {
                sendCommand({ type: 'pg:command', action: 'importSvgString', svgString: text });
            } else {
                sendCommand({
                    type: 'pg:command',
                    action: 'importJsonString',
                    jsonString: text
                });
            }
        };
        reader.readAsText(file);
    };

    const openWebFileDialog = (action: 'importImage' | 'importSvg' | 'openJson') => {
        const ref =
            action === 'importImage'
                ? webImageInputRef
                : action === 'importSvg'
                  ? webSvgInputRef
                  : webJsonInputRef;
        ref.current?.click();
    };

    const runAction = (action: string) => {
        if (action === 'importImage' || action === 'importSvg' || action === 'openJson') {
            if (Platform.OS === 'web') {
                openWebFileDialog(action);
                return;
            }
            void handleNativeImport(action);
            return;
        }
        if (action === 'switchColors') {
            const nextFill = strokeColor;
            const nextStroke = fillColor;
            setFillColor(nextFill);
            setStrokeColor(nextStroke);
            setColorDraft(colorTarget === 'fill' ? nextFill : nextStroke);
        }
        sendCommand({ type: 'pg:command', action });
    };

    const normalizeHex = (value: string) => {
        const cleaned = value.trim().replace(/^#/, '');
        if (cleaned.length === 3 && /^[0-9a-fA-F]{3}$/.test(cleaned)) {
            return (
                '#' +
                cleaned
                    .split('')
                    .map((ch) => ch + ch)
                    .join('')
                    .toLowerCase()
            );
        }
        if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
            return `#${cleaned.toLowerCase()}`;
        }
        return null;
    };

    const normalizeForPaper = (value: string | null) => {
        if (!value || value === TRANSPARENT) return null;
        return value;
    };

    const applyColor = (hex: string | null) => {
        const next = hex ?? TRANSPARENT;
        if (colorTarget === 'fill') {
            setFillColor(next);
            sendCommand({
                type: 'pg:command',
                action: 'fillColor',
                color: normalizeForPaper(next)
            });
        } else {
            setStrokeColor(next);
            sendCommand({
                type: 'pg:command',
                action: 'strokeColor',
                color: normalizeForPaper(next)
            });
        }
    };

    const webColorValue = useMemo(
        () => normalizeHex(colorDraft) || '#000000',
        [colorDraft]
    );

    const openColorPicker = (target: 'fill' | 'stroke') => {
        setColorTarget(target);
        setColorDraft(target === 'fill' ? fillColor : strokeColor);
        setColorOpen(true);
        setMenuOpen(false);
        setToolMenuOpen(false);
        setBlendOpen(false);
        setOpacityOpen(false);
        setZoomOpen(false);
        setTimeout(() => measureAnchor(colorStackRef, setColorAnchor), 0);
    };

    const commitColorDraft = () => {
        const normalizedDraft = colorDraft.trim().toLowerCase();
        if (!normalizedDraft || normalizedDraft === TRANSPARENT) {
            applyColor(null);
            setColorOpen(false);
            return;
        }
        const next = normalizeHex(colorDraft);
        if (!next) {
            return;
        }
        applyColor(next);
        setColorDraft(next);
        setColorOpen(false);
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
        const value = Math.min(100, Math.max(0, parseFloat(opacityPercent) || 100));
        setOpacityPercent(String(value));
        sendCommand({ type: 'pg:command', action: 'opacity', value: value / 100 });
    };

    const applyBlendMode = (mode: string) => {
        setBlendMode(mode);
        setBlendOpen(false);
        sendCommand({ type: 'pg:command', action: 'blendMode', value: mode });
    };

    const applyZoom = (value: string) => {
        setZoomPercent(value);
        setZoomOpen(false);
        sendCommand({ type: 'pg:command', action: 'setZoom', value: parseInt(value, 10) / 100 });
    };

    const fillIndicator = useMemo(() => {
        if (fillColor === TRANSPARENT) {
            return {};
        }
        return { backgroundColor: fillColor };
    }, [fillColor]);
    const strokeIndicator = useMemo(
        () => ({
            borderColor:
                strokeColor === TRANSPARENT ? '#000000' : strokeColor || '#000000'
        }),
        [strokeColor]
    );

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
                    style={styles.topIconButton}
                    ref={burgerRef}
                    onPress={() => {
                        setMenuOpen(true);
                        setToolMenuOpen(false);
                        setBlendOpen(false);
                        setOpacityOpen(false);
                        setZoomOpen(false);
                        setColorOpen(false);
                        setTimeout(() => measureAnchor(burgerRef, setMenuAnchor), 0);
                    }}
                >
                    <Text style={styles.topIcon}>≡</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.topMenuButton}
                    ref={toolMenuRef}
                    onPress={() => {
                        setToolMenuOpen(true);
                        setMenuOpen(false);
                        setBlendOpen(false);
                        setOpacityOpen(false);
                        setZoomOpen(false);
                        setColorOpen(false);
                        setTimeout(() => measureAnchor(toolMenuRef, setToolMenuAnchor), 0);
                    }}
                >
                    <Text style={styles.topMenuLabel}>Tool</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sideBar}>
                <ScrollView contentContainerStyle={styles.sideContent}>
                    <View style={styles.toolGrid}>
                        {TOOL_SIDEBAR.map((tool) => (
                            <TouchableOpacity
                                key={tool.id}
                                style={[
                                    styles.toolIconButton,
                                    activeTool === tool.id && styles.toolIconButtonActive
                                ]}
                                onPress={() => setTool(tool.id)}
                            >
                            <Image
                                source={tool.icon}
                                style={styles.toolIconImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                    <View style={styles.sideDivider} />

                    <View style={styles.colorStack} ref={colorStackRef}>
                        <TouchableOpacity
                            style={[
                                styles.colorSquare,
                                styles.fillSquare,
                                fillIndicator,
                                colorTarget === 'fill' && styles.colorSquareActive
                            ]}
                            onPress={() => openColorPicker('fill')}
                        >
                            {fillColor === TRANSPARENT && (
                                <>
                                    <Image
                                        source={TRANSPARENT_BG}
                                        style={styles.transparentBg}
                                        resizeMode="repeat"
                                    />
                                    <View style={styles.transparentSlash} />
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.colorSquare,
                                styles.strokeSquare,
                                strokeIndicator,
                                colorTarget === 'stroke' && styles.colorSquareActive
                            ]}
                            onPress={() => openColorPicker('stroke')}
                        >
                            {strokeColor === TRANSPARENT && (
                                <>
                                    <Image
                                        source={TRANSPARENT_BG}
                                        style={styles.transparentBg}
                                        resizeMode="repeat"
                                    />
                                    <View style={styles.transparentSlashSmall} />
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.switchButton}
                            onPress={() => runAction('switchColors')}
                        >
                            <Image
                                source={SWITCH_ICON}
                                style={styles.switchIcon}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controlBlock}>
                        <Text style={styles.controlLabel}>Opacity</Text>
                        <TouchableOpacity
                            style={styles.selectBox}
                            ref={opacityRef}
                            onPress={() => {
                                setOpacityOpen(true);
                                setBlendOpen(false);
                                setZoomOpen(false);
                                setMenuOpen(false);
                                setToolMenuOpen(false);
                                setColorOpen(false);
                                setTimeout(() => measureAnchor(opacityRef, setOpacityAnchor), 0);
                            }}
                        >
                            <Text style={styles.selectBoxLabel}>{opacityPercent}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controlBlock}>
                        <Text style={styles.controlLabel}>Blending</Text>
                        <TouchableOpacity
                            style={styles.selectBox}
                            ref={blendRef}
                            onPress={() => {
                                setBlendOpen(true);
                                setOpacityOpen(false);
                                setZoomOpen(false);
                                setMenuOpen(false);
                                setToolMenuOpen(false);
                                setColorOpen(false);
                                setTimeout(() => measureAnchor(blendRef, setBlendAnchor), 0);
                            }}
                        >
                            <Text style={styles.selectBoxLabel}>{blendMode}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.controlBlock}>
                        <Text style={styles.controlLabel}>Stroke</Text>
                        <View style={styles.strokeRow}>
                            <TextInput
                                value={strokeWidth}
                                onChangeText={setStrokeWidth}
                                onBlur={commitStrokeWidth}
                                keyboardType="numeric"
                                style={styles.strokeInput}
                            />
                            <View style={styles.strokeButtons}>
                                <TouchableOpacity
                                    style={styles.strokeButton}
                                    onPress={() => adjustStrokeWidth(1)}
                                >
                                    <Text style={styles.strokeButtonLabel}>▴</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.strokeButton}
                                    onPress={() => adjustStrokeWidth(-1)}
                                >
                                    <Text style={styles.strokeButtonLabel}>▾</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.statusBar}>
                <Text style={styles.statusText}>No selection</Text>
                <View style={styles.zoomRow}>
                    <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => runAction('zoomOut')}
                    >
                        <Text style={styles.zoomButtonLabel}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.zoomSelect}
                        ref={zoomRef}
                        onPress={() => {
                            setZoomOpen(true);
                            setOpacityOpen(false);
                            setBlendOpen(false);
                            setMenuOpen(false);
                            setToolMenuOpen(false);
                            setColorOpen(false);
                            setTimeout(() => measureAnchor(zoomRef, setZoomAnchor), 0);
                        }}
                    >
                        <Text style={styles.statusText}>Zoom</Text>
                        <Text style={styles.zoomValue}>{zoomPercent}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => runAction('zoomIn')}
                    >
                        <Text style={styles.zoomButtonLabel}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {menuOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setMenuOpen(false)} />
                    <View style={[styles.menuPanel, styles.menuPanelOverlay, getMenuBelowAnchor(menuAnchor)]}>
                        <Text style={styles.menuHeader}>{BURGER_MENU.title}</Text>
                        {BURGER_MENU.actions.map((item) => (
                            <TouchableOpacity
                                key={item.label}
                                style={styles.menuItem}
                                onPress={() => {
                                    runAction(item.action);
                                    setMenuOpen(false);
                                }}
                            >
                                <Text style={styles.menuItemText}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {toolMenuOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setToolMenuOpen(false)} />
                    <View style={[styles.menuPanel, styles.menuPanelOverlay, getMenuBelowAnchor(toolMenuAnchor)]}>
                        <Text style={styles.menuHeader}>Tool</Text>
                        {TOOL_MENU_SECTIONS.map((section) => (
                            <View key={section.title} style={styles.menuSection}>
                                <TouchableOpacity
                                    onPress={() =>
                                        setExpandedSection(
                                            expandedSection === section.title ? null : section.title
                                        )
                                    }
                                >
                                    <Text style={styles.menuItemText}>{section.title}</Text>
                                </TouchableOpacity>
                                {expandedSection === section.title && (
                                    <View style={styles.menuSubSection}>
                                        {section.actions.map((action) => (
                                            <TouchableOpacity
                                                key={action.label}
                                                style={styles.menuSubItem}
                                                onPress={() => {
                                                    runAction(action.action);
                                                    setToolMenuOpen(false);
                                                }}
                                            >
                                                <Text style={styles.menuSubItemText}>{action.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {blendOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setBlendOpen(false)} />
                    <View style={[styles.dropdownPanel, getMenuPosition(blendAnchor)]}>
                        <Text style={styles.menuHeader}>Blending</Text>
                        <ScrollView>
                            {BLEND_MODES.map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={styles.menuItem}
                                    onPress={() => applyBlendMode(mode)}
                                >
                                    <Text style={styles.menuItemText}>{mode}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {opacityOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setOpacityOpen(false)} />
                    <View style={[styles.dropdownPanel, getMenuPosition(opacityAnchor)]}>
                        <Text style={styles.menuHeader}>Opacity</Text>
                        <ScrollView>
                            {OPACITY_OPTIONS.map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setOpacityPercent(value);
                                        setOpacityOpen(false);
                                        sendCommand({
                                            type: 'pg:command',
                                            action: 'opacity',
                                            value: parseInt(value, 10) / 100
                                        });
                                    }}
                                >
                                    <Text style={styles.menuItemText}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {zoomOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setZoomOpen(false)} />
                    <View style={[styles.dropdownPanel, getMenuPosition(zoomAnchor)]}>
                        <Text style={styles.menuHeader}>Zoom</Text>
                        <ScrollView>
                            {ZOOM_OPTIONS.map((value) => (
                                <TouchableOpacity
                                    key={value}
                                    style={styles.menuItem}
                                    onPress={() => applyZoom(value)}
                                >
                                    <Text style={styles.menuItemText}>{value}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            {colorOpen && (
                <View style={styles.overlay}>
                    <Pressable style={styles.overlayBackdrop} onPress={() => setColorOpen(false)} />
                    <View style={[styles.colorPanel, getMenuPosition(colorAnchor)]}>
                        <Text style={styles.menuHeader}>
                            {colorTarget === 'fill' ? 'Fill color' : 'Stroke color'}
                        </Text>
                        <View style={styles.colorTargetRow}>
                            <TouchableOpacity
                                style={[
                                    styles.colorTargetChip,
                                    colorTarget === 'fill' && styles.colorTargetChipActive
                                ]}
                                onPress={() => {
                                    setColorTarget('fill');
                                    setColorDraft(fillColor);
                                }}
                            >
                                <Text style={styles.colorTargetLabel}>Fill</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.colorTargetChip,
                                    colorTarget === 'stroke' && styles.colorTargetChipActive
                                ]}
                                onPress={() => {
                                    setColorTarget('stroke');
                                    setColorDraft(strokeColor);
                                }}
                            >
                                <Text style={styles.colorTargetLabel}>Stroke</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.swatchGrid}>
                            {COLOR_SWATCHES.map((swatch) => {
                                const isTransparent = swatch.value === null;
                                return (
                                    <TouchableOpacity
                                        key={swatch.label}
                                        style={[
                                            styles.swatch,
                                            isTransparent
                                                ? styles.transparentSwatch
                                                : { backgroundColor: swatch.value }
                                        ]}
                                        onPress={() => {
                                            const value = swatch.value ?? TRANSPARENT;
                                            setColorDraft(value);
                                            applyColor(swatch.value);
                                            setColorOpen(false);
                                        }}
                                    >
                                        {isTransparent && (
                                            <>
                                                <Image
                                                    source={TRANSPARENT_BG}
                                                    style={styles.transparentBgSmall}
                                                    resizeMode="repeat"
                                                />
                                                <View style={styles.transparentSlashSmall} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.hexRow}>
                            <TextInput
                                value={colorDraft}
                                onChangeText={setColorDraft}
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={11}
                                style={styles.hexInput}
                                placeholder="#000000"
                                onSubmitEditing={commitColorDraft}
                                onBlur={commitColorDraft}
                            />
                            <TouchableOpacity style={styles.hexApply} onPress={commitColorDraft}>
                                <Text style={styles.hexApplyText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                        {Platform.OS === 'web' && (
                            <View style={styles.webColorRow}>
                                <Text style={styles.controlLabel}>Picker</Text>
                                <WebColorInput
                                    type="color"
                                    value={webColorValue}
                                    onChange={(event: any) => {
                                        const value = event?.target?.value;
                                        if (!value) return;
                                        setColorDraft(value);
                                        applyColor(value);
                                    }}
                                    style={styles.webColorInput}
                                />
                            </View>
                        )}
                    </View>
                </View>
            )}

            {Platform.OS === 'web' && (
                <>
                    <WebFileInput
                        ref={webImageInputRef}
                        type="file"
                        accept="image/*"
                        style={styles.hiddenInput}
                        onChange={(event: any) => {
                            const file = event?.target?.files?.[0];
                            if (file) handleWebFile(file, 'importImage');
                            if (event?.target) event.target.value = '';
                        }}
                    />
                    <WebFileInput
                        ref={webSvgInputRef}
                        type="file"
                        accept=".svg,image/svg+xml"
                        style={styles.hiddenInput}
                        onChange={(event: any) => {
                            const file = event?.target?.files?.[0];
                            if (file) handleWebFile(file, 'importSvg');
                            if (event?.target) event.target.value = '';
                        }}
                    />
                    <WebFileInput
                        ref={webJsonInputRef}
                        type="file"
                        accept=".json,application/json"
                        style={styles.hiddenInput}
                        onChange={(event: any) => {
                            const file = event?.target?.files?.[0];
                            if (file) handleWebFile(file, 'openJson');
                            if (event?.target) event.target.value = '';
                        }}
                    />
                </>
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
        height: TOP_BAR_HEIGHT,
        backgroundColor: '#3f3f3f',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        zIndex: 10
    },
    topIconButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8
    },
    topIcon: {
        color: '#e0e0e0',
        fontSize: 18
    },
    topMenuButton: {
        paddingHorizontal: 6,
        paddingVertical: 4
    },
    topMenuLabel: {
        color: '#e0e0e0',
        fontSize: 14
    },
    sideBar: {
        position: 'absolute',
        top: TOP_BAR_HEIGHT,
        left: 0,
        bottom: 0,
        width: SIDE_BAR_WIDTH,
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#d8d8d8',
        zIndex: 9
    },
    sideContent: {
        paddingVertical: 8,
        alignItems: 'center'
    },
    toolGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%'
    },
    toolIconButton: {
        width: 28,
        height: 28,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 2,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    toolIconButtonActive: {
        backgroundColor: '#e6e6e6',
        borderColor: '#b8b8b8'
    },
    toolIconImage: {
        width: 20,
        height: 20
    },
    sideDivider: {
        width: '70%',
        height: 1,
        backgroundColor: '#dedede',
        marginVertical: 12
    },
    colorStack: {
        width: 46,
        height: 50,
        marginBottom: 12
    },
    colorSquare: {
        width: 26,
        height: 26,
        borderWidth: 1,
        borderColor: '#333333',
        position: 'absolute'
    },
    fillSquare: {
        top: 0,
        left: 0
    },
    strokeSquare: {
        bottom: 0,
        right: 0,
        backgroundColor: '#ffffff'
    },
    colorSquareActive: {
        borderColor: '#000000',
        borderWidth: 2
    },
    switchButton: {
        position: 'absolute',
        right: -6,
        top: 8,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    switchIcon: {
        width: 16,
        height: 16
    },
    transparentSlash: {
        position: 'absolute',
        width: 32,
        height: 2,
        backgroundColor: '#d14b4b',
        transform: [{ rotate: '-45deg' }],
        top: 12,
        left: -4
    },
    transparentSlashSmall: {
        position: 'absolute',
        width: 18,
        height: 2,
        backgroundColor: '#d14b4b',
        transform: [{ rotate: '-45deg' }],
        top: 12,
        left: 2
    },
    transparentBg: {
        position: 'absolute',
        width: 26,
        height: 26,
        top: 0,
        left: 0
    },
    transparentBgSmall: {
        position: 'absolute',
        width: 24,
        height: 24,
        top: 0,
        left: 0
    },
    controlBlock: {
        width: 60,
        marginBottom: 12,
        alignItems: 'center'
    },
    controlLabel: {
        fontSize: 10,
        color: '#666666',
        marginBottom: 4
    },
    selectBox: {
        width: 50,
        height: 26,
        borderWidth: 1,
        borderColor: '#cccccc',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectBoxLabel: {
        fontSize: 12,
        color: '#222222'
    },
    strokeRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    strokeInput: {
        width: 30,
        height: 26,
        borderWidth: 1,
        borderColor: '#cccccc',
        textAlign: 'center',
        fontSize: 12,
        backgroundColor: '#ffffff'
    },
    strokeButtons: {
        marginLeft: 4
    },
    strokeButton: {
        width: 18,
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#cccccc',
        backgroundColor: '#ffffff'
    },
    strokeButtonLabel: {
        fontSize: 10,
        color: '#222222'
    },
    statusBar: {
        position: 'absolute',
        right: 10,
        bottom: 6,
        flexDirection: 'row',
        alignItems: 'center'
    },
    zoomRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    zoomButton: {
        width: 22,
        height: 22,
        borderWidth: 1,
        borderColor: '#cccccc',
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4
    },
    zoomButtonLabel: {
        fontSize: 14,
        color: '#333333',
        lineHeight: 16
    },
    statusText: {
        color: '#777777',
        fontSize: 12,
        marginRight: 8
    },
    zoomSelect: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#cccccc',
        backgroundColor: '#ffffff',
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    zoomValue: {
        marginLeft: 6,
        fontSize: 12,
        color: '#111111'
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20
    },
    overlayBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    menuPanel: {
        position: 'absolute',
        width: 240,
        backgroundColor: '#3f3f3f',
        borderRightWidth: 1,
        borderRightColor: '#2d2d2d',
        paddingVertical: 10
    },
    menuPanelOverlay: {
        top: TOP_BAR_HEIGHT,
        left: 0
    },
    dropdownPanel: {
        position: 'absolute',
        top: TOP_BAR_HEIGHT + 40,
        left: SIDE_BAR_WIDTH + 6,
        width: 240,
        maxHeight: 320,
        backgroundColor: '#3f3f3f',
        borderWidth: 1,
        borderColor: '#2d2d2d',
        paddingVertical: 10
    },
    colorPanel: {
        position: 'absolute',
        top: TOP_BAR_HEIGHT + 40,
        left: SIDE_BAR_WIDTH + 6,
        width: 240,
        backgroundColor: '#3f3f3f',
        borderWidth: 1,
        borderColor: '#2d2d2d',
        padding: 12
    },
    menuHeader: {
        color: '#f0f0f0',
        fontSize: 14,
        marginBottom: 10,
        marginHorizontal: 12
    },
    menuItem: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: '#4a4a4a'
    },
    menuItemText: {
        color: '#e0e0e0',
        fontSize: 13
    },
    menuSection: {
        borderTopWidth: 1,
        borderTopColor: '#4a4a4a'
    },
    menuSubSection: {
        paddingLeft: 12
    },
    menuSubItem: {
        paddingVertical: 8,
        paddingHorizontal: 12
    },
    menuSubItemText: {
        color: '#cfcfcf',
        fontSize: 12
    },
    colorTargetRow: {
        flexDirection: 'row',
        marginBottom: 10
    },
    colorTargetChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#5a5a5a',
        marginRight: 8,
        borderRadius: 3
    },
    colorTargetChipActive: {
        backgroundColor: '#555555',
        borderColor: '#777777'
    },
    colorTargetLabel: {
        color: '#e0e0e0',
        fontSize: 12
    },
    swatchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12
    },
    swatch: {
        width: 24,
        height: 24,
        borderWidth: 1,
        borderColor: '#444444',
        margin: 4
    },
    transparentSwatch: {
        backgroundColor: '#ffffff'
    },
    hexRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    hexInput: {
        flex: 1,
        height: 28,
        borderWidth: 1,
        borderColor: '#666666',
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        marginRight: 8,
        fontSize: 12
    },
    hexApply: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#4a4a4a',
        borderRadius: 3
    },
    hexApplyText: {
        color: '#f0f0f0',
        fontSize: 12
    },
    webColorRow: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    webColorInput: {
        width: 40,
        height: 28,
        borderWidth: 0,
        backgroundColor: 'transparent'
    },
    hiddenInput: {
        display: 'none'
    }
});
