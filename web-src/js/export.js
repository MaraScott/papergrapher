// functions related to exporting

pg.export = function() {
	var exportRect;
	var canvas;
	var hasNativeBridge = false;

	var postToNative = function(payload) {
		if (!hasNativeBridge) return;
		try {
			window.ReactNativeWebView.postMessage(JSON.stringify(payload));
		} catch (e) {
			// no-op
		}
	};
	
	var getSafeFileName = function(defaultName) {
		var fallbackName = defaultName || "export";
		try {
			var name = prompt("Name your file", fallbackName);
			if (name === null || name === "") {
				return hasNativeBridge ? fallbackName : null;
			}
			return name;
		} catch (e) {
			return hasNativeBridge ? fallbackName : null;
		}
	};
	
	var blobToDataUrl = function(blob, callback) {
		var reader = new FileReader();
		reader.onloadend = function() {
			callback(reader.result);
		};
		reader.readAsDataURL(blob);
	};
	
	
	var setup = function() {
		canvas = document.getElementById("paperCanvas");
		hasNativeBridge = !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
	};
	
	
	var setExportRect = function(rect) {
		exportRect = rect;
	};
	
	
	var getExportRect = function() {
		return exportRect;
	};
	
	
	var clearExportRect = function() {
		exportRect = null;
	};
	
	
	var exportAndPromptImage = function() {
		var fileName = getSafeFileName("export");

		if (fileName !== null) {
			pg.hover.clearHoveredItem();
			pg.selection.clearSelection();
			var activeLayer = pg.layer.getActiveLayer();
			
			// backup guide layer, then remove it (with all children) before export
			var guideLayer = pg.layer.getGuideLayer();
			var guideLayerBackup = guideLayer.exportJSON();
			guideLayer.remove();
			paper.view.update();
			
			if(exportRect) {
				pg.view.resetZoom();
				pg.view.resetPan();
				paper.view.update();
				var offsetX = parseInt(canvas.width *0.5) + exportRect.x;
				var offsetY = parseInt(canvas.height *0.5) + exportRect.y;
				
				var fileNameNoExtension = fileName.split(".png")[0];
				var ctx = canvas.getContext("2d");
				var imgData = ctx.getImageData(offsetX, offsetY, exportRect.width, exportRect.height);

				var $tempCanvas = jQuery('<canvas width="'+exportRect.width+'" height="'+exportRect.height+'" style="position: absolute; z-index: -5;">');
				
				jQuery('body').append($tempCanvas);

				var context = $tempCanvas[0].getContext("2d");
				context.putImageData(imgData,0,0);
				$tempCanvas[0].toBlob(function(blob) {
					if (hasNativeBridge) {
						blobToDataUrl(blob, function(dataUrl) {
							postToNative({
								type: "export:image",
								fileName: fileNameNoExtension + ".png",
								dataUrl: dataUrl
							});
							
							// restore guide layer (with all items) after export
							paper.project.importJSON(guideLayerBackup);
							
							// then reactivate the active layer
							activeLayer.activate();
						});
						return;
					}
					saveAs(blob, fileNameNoExtension+'.png');
						
					// restore guide layer (with all items) after export
					paper.project.importJSON(guideLayerBackup);
					
					// then reactivate the active layer
					activeLayer.activate();
				});

				
				$tempCanvas.remove();
				
			} else {
				var fileNameNoExtension = fileName.split(".png")[0];
				canvas.toBlob(function(blob) {
					if (hasNativeBridge) {
						blobToDataUrl(blob, function(dataUrl) {
							postToNative({
								type: "export:image",
								fileName: fileNameNoExtension + ".png",
								dataUrl: dataUrl
							});
							
							// restore guide layer (with all items) after export
							paper.project.importJSON(guideLayerBackup);
							
							// then reactivate the active layer
							activeLayer.activate();
						});
						return;
					}
					saveAs(blob, fileNameNoExtension+'.png');
					
					// restore guide layer (with all items) after export
					paper.project.importJSON(guideLayerBackup);
					
					// then reactivate the active layer
					activeLayer.activate();
				});
			}
			
			
		}
	};
	
	
	var exportAndPromptSVG = function() {
		var fileName = getSafeFileName("export");

		if (fileName !== null) {
			pg.hover.clearHoveredItem();
			pg.selection.clearSelection();
			
			var activeLayer = pg.layer.getActiveLayer();
			
			var fileNameNoExtension = fileName.split(".svg")[0];
			
			// backup guide layer, then remove it (with all children) before export
			var guideLayer = pg.layer.getGuideLayer();
			var guideLayerBackup = guideLayer.exportJSON();
			guideLayer.remove();
			paper.view.update();
			
			// export data, create blob  and save as file on users device
			var exportData = paper.project.exportSVG({ asString: true, bounds: exportRect });
			if (hasNativeBridge) {
				var svgBase64 = window.btoa(unescape(encodeURIComponent(exportData)));
				postToNative({
					type: "export:svg",
					fileName: fileNameNoExtension + ".svg",
					dataUrl: "data:image/svg+xml;base64," + svgBase64
				});
			} else {
				var blob = new Blob([exportData], {type: "image/svg+xml;charset=" + document.characterSet});
				saveAs(blob, fileNameNoExtension+'.svg');
			}
			
			// restore guide layer (with all items) after export
			paper.project.importJSON(guideLayerBackup);
			
			// then reactivate the active layer
			activeLayer.activate();
		}
	};
	
	
	return {
		setup: setup,
		getExportRect: getExportRect,
		setExportRect: setExportRect,
		clearExportRect: clearExportRect,
		exportAndPromptImage: exportAndPromptImage,
		exportAndPromptSVG: exportAndPromptSVG
	};
	
}();
