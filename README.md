# Papergrapher Expo

This folder now contains an Expo (React Native + ReactJS) wrapper around Papergrapher.
The original Papergrapher source lives in `web-src/` and is compiled into a single,
self-contained HTML file for use inside a WebView on native and an iframe on web.

## Quick start

```bash
npm install
npm run build:assets
npm start
```

## How it works

- `web-src/` holds the original Papergrapher project (unchanged).
- `scripts/build-inline.js` inlines CSS/JS/assets into `assets/papergrapher/index.html`.
- `App.tsx` loads that HTML in a WebView (native) or iframe (web).

## When you change Papergrapher

If you edit anything in `web-src/`, rebuild the inline HTML:

```bash
npm run build:assets
```

## Notes

- The inline build embeds fonts, tool icons, and example scripts so it works offline.
- This Expo app is intentionally minimal and focused on hosting the editor.
