
pg.view = function() {
	
	var zoomBy = function(factor) {
		paper.view.zoom *= factor;
		if(paper.view.zoom <= 0.01) {
			paper.view.zoom = 0.01;
		} else if(paper.view.zoom >= 1000) {
			paper.view.zoom = 1000;
		}
		pg.statusbar.update();
	};

	var zoomByPoint = function(factor, viewPoint) {
		var view = paper.view;
		var zoom = view.zoom;
		var newZoom = zoom * factor;

		if(newZoom <= 0.01) {
			newZoom = 0.01;
		} else if(newZoom >= 1000) {
			newZoom = 1000;
		}

		if(viewPoint && view.viewToProject) {
			var projectPoint = view.viewToProject(viewPoint);
			var beta = zoom / newZoom;
			var offset = projectPoint.subtract(view.center);
			view.zoom = newZoom;
			view.center = projectPoint.subtract(offset.multiply(beta));
		} else {
			view.zoom = newZoom;
		}
		pg.statusbar.update();
	};
	
	
	var resetZoom = function() {
		paper.view.zoom = 1;
		pg.statusbar.update();
	};
	
	
	var resetPan = function() {
		paper.view.center = pg.document.getCenter();
	};
	
	
	return {
		zoomBy: zoomBy,
		zoomByPoint: zoomByPoint,
		resetZoom: resetZoom,
		resetPan: resetPan
	};
}();
