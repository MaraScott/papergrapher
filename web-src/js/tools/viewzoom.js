// view zoom tool
// adapted from http://sketch.paperjs.org/

pg.tools.registerTool({
	id: 'viewzoom',
	name: 'View zoom',
	type: 'hidden'
});

pg.tools.viewzoom = function() {
	var tool;
	var ePoint;
	
	var options = {};
	
	var activateTool = function() {
		tool = new Tool();
		
		ePoint = paper.view.center;
		
		tool.onMouseMove = function(event) {
			ePoint = event.point;
		};
		
		tool.activate();
	};
	
	
	var updateTool = function(updateInfo) {
		var oe = updateInfo.originalEvent || updateInfo;
		var factor = 1.25;
		if (oe.wheelDelta > 0 || oe.detail < 0) {
			// scroll up / zoom in
		} else {
			// scroll down / zoom out
			factor = 1 / factor;
		}

		var canvas = document.getElementById('paperCanvas');
		var clientX = oe.clientX;
		var clientY = oe.clientY;
		if((clientX === undefined || clientY === undefined) && updateInfo) {
			clientX = updateInfo.clientX;
			clientY = updateInfo.clientY;
		}

		if(canvas && clientX !== undefined && clientY !== undefined) {
			var rect = canvas.getBoundingClientRect();
			var viewPoint = new Point(clientX - rect.left, clientY - rect.top);
			pg.view.zoomByPoint(factor, viewPoint);
		} else {
			paper.view.center = ePoint;
			pg.view.zoomBy(factor);
		}
	};
	
	
	return {
		options:options,
		activateTool : activateTool,
		updateTool: updateTool
	};
};


