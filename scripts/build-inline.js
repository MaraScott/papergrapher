const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'web-src');
const outDir = path.join(rootDir, 'assets', 'papergrapher');
const indexPath = path.join(srcDir, 'index.html');
const outputPath = path.join(outDir, 'index.html');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readBinary(filePath) {
  return fs.readFileSync(filePath);
}

function toDataUri(filePath, mimeType) {
  const base64 = readBinary(filePath).toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

function replaceCssAssets(css, replacements) {
  return replacements.reduce((acc, replacement) => {
    const { pattern, value } = replacement;
    return acc.replace(pattern, `url('${value}')`);
  }, css);
}

function patchToolbarJs(content) {
  const needle = "$tool.css({'background-image': 'url(assets/tools/tool_'+tool.id+'.svg)'});";
  if (!content.includes(needle)) {
    return content;
  }

  const replacement = [
    "var toolIcon = window.__PG_TOOL_ICONS__ && window.__PG_TOOL_ICONS__[tool.id];",
    "if (toolIcon) {",
    "\t$tool.css({'background-image': 'url(' + toolIcon + ')'});",
    "} else {",
    "\t$tool.css({'background-image': 'url(assets/tools/tool_'+tool.id+'.svg)'});",
    "}"
  ].join('\n\t\t\t');

  return content.replace(needle, replacement);
}

function patchTextJs(content) {
  const getJsonBlock = "\t\tjQuery.getJSON('fonts/fonts.json', function(data){\n\t\t\tjQuery.each(data.fonts, function(index, fontName) {";
  if (content.includes(getJsonBlock)) {
    const replacement = "\t\tvar data = { fonts: (window.__PG_FONT_LIST__ || []) };\n\t\t\tjQuery.each(data.fonts, function(index, fontName) {\n\t\t\t\tvar fontSource = (window.__PG_FONT_DATA__ && window.__PG_FONT_DATA__[fontName]) ? window.__PG_FONT_DATA__[fontName] : 'fonts/' + fontName;";
    content = content.replace(getJsonBlock, replacement);
  }

  const loadNeedle = "opentype.load('fonts/'+fontName, function (err, font) {";
  content = content.replace(loadNeedle, 'opentype.load(fontSource, function (err, font) {');

  content = content.replace("\t\t\t});\n\t\t});", "\t\t\t});");

  return content;
}

function patchCodeEditorJs(content) {
  const cssBlock = [
    '\t\tjQuery("<link />", {',
    '\t\t\thref: "css/codeEditor.css",',
    '\t\t\trel: "stylesheet",',
    '\t\t\tid: "codeEditorCSS"',
    '\t\t}).appendTo("head");'
  ].join('\n');

  if (content.includes(cssBlock)) {
    const replacement = [
      '\t\tif (window.__PG_CODE_EDITOR_CSS__) {',
      '\t\t\tif (!document.getElementById("codeEditorCSS")) {',
      '\t\t\t\tjQuery("<style />", { id: "codeEditorCSS" })',
      '\t\t\t\t\t.text(window.__PG_CODE_EDITOR_CSS__)',
      '\t\t\t\t\t.appendTo("head");',
      '\t\t\t}',
      '\t\t} else {',
      '\t\t\tjQuery("<link />", {',
      '\t\t\t\thref: "css/codeEditor.css",',
      '\t\t\t\trel: "stylesheet",',
      '\t\t\t\tid: "codeEditorCSS"',
      '\t\t\t}).appendTo("head");',
      '\t\t}'
    ].join('\n');
    content = content.replace(cssBlock, replacement);
  }

  const scriptsBlock = [
    "\t\tjQuery.getJSON('user/scripts/scripts.json', function(data) {",
    '\t\t\tjQuery.each(data.scripts, function(index, scriptID) {',
    '\t\t\t\tvar $option = jQuery(\'<option value="\'+scriptID+\'">\'+scriptID+\'.js</option>\');',
    '\t\t\t\t$select.append($option);',
    '\t\t\t});',
    '\t\t});'
  ].join('\n');

  if (content.includes(scriptsBlock)) {
    const replacement = [
      '\t\tvar data = window.__PG_USER_SCRIPTS__ || { scripts: [] };',
      '\t\tjQuery.each((data.scripts || []), function(index, scriptID) {',
      '\t\t\tvar $option = jQuery(\'<option value="\'+scriptID+\'">\'+scriptID+\'.js</option>\');',
      '\t\t\t$select.append($option);',
      '\t\t});'
    ].join('\n');
    content = content.replace(scriptsBlock, replacement);
  }

  const ajaxBlock = [
    '\t\t\tjQuery.ajax({',
    "\t\t\t\turl: 'user/scripts/'+scriptID+'.js',",
    "\t\t\t\tdataType: 'text',",
    '\t\t\t\tsuccess: function(data) {',
    "\t\t\t\t\tjQuery('#codeEditorArea').val(data);",
    '\t\t\t\t}',
    '\t\t\t});'
  ].join('\n');

  if (content.includes(ajaxBlock)) {
    const replacement = [
      '\t\t\tvar scriptsData = window.__PG_USER_SCRIPTS__ && window.__PG_USER_SCRIPTS__.content',
      '\t\t\t\t? window.__PG_USER_SCRIPTS__.content',
      '\t\t\t\t: {};',
      '\t\t\tif (scriptsData && scriptsData[scriptID]) {',
      "\t\t\t\tjQuery('#codeEditorArea').val(scriptsData[scriptID]);",
      '\t\t\t} else {',
      "\t\t\t\tjQuery('#codeEditorArea').val(defaultScript);",
      '\t\t\t}'
    ].join('\n');
    content = content.replace(ajaxBlock, replacement);
  }

  return content;
}

function patchScript(src, content) {
  if (src === 'js/toolbar.js') {
    return patchToolbarJs(content);
  }
  if (src === 'js/text.js') {
    return patchTextJs(content);
  }
  if (src === 'js/codeEditor.js') {
    return patchCodeEditorJs(content);
  }
  return content;
}

function buildInlineHtml() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing source index.html at ${indexPath}`);
  }

  const html = readText(indexPath);
  const cssLinks = [];
  const scriptTags = [];

  let processed = html.replace(/<link[^>]*href="([^"]+)"[^>]*>/g, (match, href) => {
    if (href.startsWith('css/')) {
      cssLinks.push(href);
      return '';
    }
    return match;
  });

  processed = processed.replace(/<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/g, (match, src) => {
    const typeMatch = match.match(/type="([^"]+)"/);
    const dataCanvasMatch = match.match(/data-paper-canvas="([^"]+)"/);
    scriptTags.push({
      src,
      type: typeMatch ? typeMatch[1] : null,
      dataCanvas: dataCanvasMatch ? dataCanvasMatch[1] : null
    });
    return '';
  });

  const toolIcons = {};
  const toolsDir = path.join(srcDir, 'assets', 'tools');
  if (fs.existsSync(toolsDir)) {
    for (const file of fs.readdirSync(toolsDir)) {
      if (!file.startsWith('tool_') || !file.endsWith('.svg')) continue;
      const id = file.slice('tool_'.length, -'.svg'.length);
      toolIcons[id] = toDataUri(path.join(toolsDir, file), 'image/svg+xml');
    }
  }

  const fontListPath = path.join(srcDir, 'fonts', 'fonts.json');
  const fontsJson = JSON.parse(readText(fontListPath));
  const fontList = Array.isArray(fontsJson.fonts) ? fontsJson.fonts : [];
  const fontData = {};
  for (const fontName of fontList) {
    const fontPath = path.join(srcDir, 'fonts', fontName);
    if (fs.existsSync(fontPath)) {
      fontData[fontName] = toDataUri(fontPath, 'font/ttf');
    }
  }

  const userScriptsPath = path.join(srcDir, 'user', 'scripts', 'scripts.json');
  const userScriptsJson = JSON.parse(readText(userScriptsPath));
  const userScriptList = Array.isArray(userScriptsJson.scripts) ? userScriptsJson.scripts : [];
  const userScriptContent = {};
  for (const scriptId of userScriptList) {
    const scriptPath = path.join(srcDir, 'user', 'scripts', `${scriptId}.js`);
    if (fs.existsSync(scriptPath)) {
      userScriptContent[scriptId] = readText(scriptPath);
    }
  }

  const codeEditorCss = readText(path.join(srcDir, 'css', 'codeEditor.css'));

  const iconSwitchPath = path.join(srcDir, 'assets', 'icon_switchColor.svg');
  const selectButtonPath = path.join(srcDir, 'assets', 'selectButton.png');

  const cssReplacements = [
    {
      pattern: /url\((['"]?)\.\.\/assets\/icon_switchColor\.svg\1\)/g,
      value: toDataUri(iconSwitchPath, 'image/svg+xml')
    },
    {
      pattern: /url\((['"]?)\.\.\/assets\/selectButton\.png\1\)/g,
      value: toDataUri(selectButtonPath, 'image/png')
    }
  ];

  const cssInline = cssLinks
    .map((href) => {
      const cssPath = path.join(srcDir, href);
      const cssContent = replaceCssAssets(readText(cssPath), cssReplacements);
      return `/* ${href} */\n${cssContent}`;
    })
    .join('\n\n');

  const initIndex = scriptTags.findIndex((tag) => tag.src === 'js/init.js');
  const extraScripts = ['js/lib/stacktrace.js', 'js/lib/taboverride.min.js'];
  if (initIndex >= 0) {
    const inserts = extraScripts.map((src) => ({ src, type: null, dataCanvas: null }));
    scriptTags.splice(initIndex, 0, ...inserts);
  } else {
    for (const src of extraScripts) {
      scriptTags.push({ src, type: null, dataCanvas: null });
    }
  }

  const bootstrapScript = [
    'window.__PG_TOOL_ICONS__ = ' + safeJson(toolIcons) + ';',
    'window.__PG_FONT_LIST__ = ' + safeJson(fontList) + ';',
    'window.__PG_FONT_DATA__ = ' + safeJson(fontData) + ';',
    'window.__PG_USER_SCRIPTS__ = ' + safeJson({ scripts: userScriptList, content: userScriptContent }) + ';',
    'window.__PG_CODE_EDITOR_CSS__ = ' + safeJson(codeEditorCss) + ';'
  ].join('\n');

  const inlineScripts = [
    `<script>\n${bootstrapScript}\n</script>`,
    ...scriptTags.map((tag) => {
      const scriptPath = path.join(srcDir, tag.src);
      const raw = readText(scriptPath);
      const patched = patchScript(tag.src, raw);
      const attrs = [];
      if (tag.type) attrs.push(`type="${tag.type}"`);
      if (tag.dataCanvas) attrs.push(`data-paper-canvas="${tag.dataCanvas}"`);
      const attrString = attrs.length ? ' ' + attrs.join(' ') : '';
      return `<script${attrString}>\n${patched}\n</script>`;
    })
  ].join('\n');

  processed = processed.replace(/<\/head>/i, `<style>\n${cssInline}\n</style>\n</head>`);
  processed = processed.replace(/<\/body>/i, `${inlineScripts}\n</body>`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outputPath, processed, 'utf8');

  return outputPath;
}

try {
  const output = buildInlineHtml();
  console.log(`Generated inline HTML at ${output}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
