/************************
 *作者：JuicyGilbert
 *2020年3月12日 15:01:08
 *************************/

//---------------type------------------------
const PAINTER_TYPE_NONE = "PAINTER.None";
const PAINTER_TYPE_LINE = "PAINTER.Line";
const PAINTER_TYPE_CIRCULAR = "PAINTER.Circular";
const PAINTER_TYPE_TEXT = "PAINTER.Text";
const PAINTER_TYPE_ARC = "PAINTER.Arc";
const PAINTER_TYPE_RECT = "PAINTER.Rect";
const PAINTER_TYPE_PATH = "PAINTER.Path";

//------------------signals----------------
const SIGNAL_PICKUP_DATA = "SIGNAL_PICKUP_DATA";

//------------------painter----------------
const PAINTER = (function() {
	//--------------------private functions-------------------
	const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	const guid = () => (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());

	const isCanvasBlank = (canvas) => {
		var blank = document.createElement('canvas');
		blank.width = canvas.width;
		blank.height = canvas.height;
		return canvas.toDataURL() == blank.toDataURL();
	}

	const drawAll = (painter) => {
		if (painter._datas.length <= 0 && painter._backgroundImage == undefined) {
			return;
		}
		painter.clearCanvas();
		if (painter._backgroundImage != undefined) {
			painter._backgroundImage.onload = function() {
				painter._bufferContext.drawImage(painter._backgroundImage, 0, 0);
				drawDatas(painter);
			}
		} else {
			drawDatas(painter);
		}
	}

	const drawDatas = (painter) => {
		let datas = painter._datas;
		for (let i = 0; i < datas.length; ++i) {
			let data = datas[i];
			if (data.type == PAINTER_TYPE_LINE) {
				drawLine(painter, data);
			} else if (data.type == PAINTER_TYPE_CIRCULAR) {
				drawCircular(painter, data)
			} else if (data.type == PAINTER_TYPE_TEXT) {
				drawText(painter, data);
			} else if (data.type == PAINTER_TYPE_ARC) {
				drawArc(painter, data);
			} else if (data.type == PAINTER_TYPE_RECT) {
				drawRect(painter, data);
			} else if (data.type == "PAINTER.Path") {
				// drawPathFromData(painter, data)
			}
		}
		drawBuffer(painter);

	}

	const drawBuffer = painter => {
		const bufferCanvas = painter._bufferCanvas;
		const displayArea = painter._displayArea;
		// painter._context.drawImage(bufferCanvas, displayArea.sx, displayArea.sy,
		// 	displayArea.sw, displayArea.sh,
		// 	0, 0,
		// 	painter._canvas.width, painter._canvas.height);

		painter._context.drawImage(bufferCanvas, displayArea.sx, displayArea.sy,
			displayArea.sw, displayArea.sh,
			displayArea.x, displayArea.y,
			displayArea.w, displayArea.h);
	};

	const drawLine = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();
		painter._bufferContext.lineWidth = data.lineWidth;
		painter._bufferContext.strokeStyle = data.color;
		painter._bufferContext.moveTo(parseFloat(data.start.x) + painter._displayArea.sx, parseFloat(data.start.y) +
			painter._displayArea.sy);
		painter._bufferContext.lineTo(parseFloat(data.end.x) + painter._displayArea.sx, parseFloat(data.end.y) + painter._displayArea
			.sy);

		painter._bufferContext.stroke();
		if (painter._canPickup && data.canPickup &&
			painter._bufferContext.isPointInStroke(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
				parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
			painter.emit(SIGNAL_PICKUP_DATA, data);
			painter._canPickup = false;
		}

		painter._bufferContext.closePath();
		painter._bufferContext.restore();
	}

	const drawCircular = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();
		painter._bufferContext.lineWidth = data.lineWidth;
		painter._bufferContext.arc(parseFloat(data.center.x) + painter._displayArea.sx,
			parseFloat(data.center.y) + painter._displayArea.sy, data.r, data.startAngle, data.endAngle,
			data.counterclockwise);
		painter._bufferContext.strokeStyle = data.color;
		if (data.isFill) {
			painter._bufferContext.fillStyle = data.fillColor;
			painter._bufferContext.fill();
		}

		if (data.isClose) {
			painter._bufferContext.closePath();
		}

		painter._bufferContext.stroke();

		if (painter._canPickup && data.canPickup &&
			painter._bufferContext.isPointInPath(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
				parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
			painter.emit(SIGNAL_PICKUP_DATA, data);
			painter._canPickup = false;
		}

		painter._bufferContext.restore();
	}

	const drawText = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();

		painter._bufferContext.translate(parseFloat(data.center.x) + painter._displayArea.sx,
			parseFloat(data.center.y) + painter._displayArea.sy);
		painter._bufferContext.strokeStyle = data.color;
		painter._bufferContext.fillStyle = data.fillColor;
		painter._bufferContext.rotate(data.rotate);
		painter._bufferContext.textAlign = data.textAlign;
		painter._bufferContext.textBaseline = data.textBaseline;
		painter._bufferContext.font = data.fontSize.toString() + "px sans-serif";
		painter._bufferContext.fillText(data.text, 0, 0);

		if (painter._canPickup && data.canPickup) {
			painter._bufferContext.restore();
			painter._bufferContext.save();
			painter._bufferContext.strokeStyle = "transparent";
			let w = painter._bufferContext.measureText(data.text).width;
			let h = data.fontSize;
			let x = parseFloat(data.center.x) + painter._displayArea.sx - w / 2;
			let y = parseFloat(data.center.y) + painter._displayArea.sy - h / 2;

			painter._bufferContext.rect(x, y, w, h);
			painter._bufferContext.stroke();

			if (painter._bufferContext.isPointInPath(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
					parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
				painter.emit(SIGNAL_PICKUP_DATA, data);
				painter._canPickup = false;
			}
		}
		painter._bufferContext.closePath();
		painter._bufferContext.restore();
	}

	const drawArc = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();
		painter._bufferContext.lineWidth = data.lineWidth;
		painter._bufferContext.moveTo(parseFloat(data.start.x) + painter._displayArea.sx,
			parseFloat(data.start.y) + painter._displayArea.sy);

		painter._bufferContext.arcTo(parseFloat(data.center.x) + painter._displayArea.sx,
			parseFloat(data.center.y) + painter._displayArea.sy, data.end.x + painter._displayArea.sx,
			data.end.y + painter._displayArea.sy, data.r);
		painter._bufferContext.strokeStyle = data.color;

		if (data.isClose) {
			painter._bufferContext.closePath();
		}

		if (data.isFill) {
			painter._bufferContext.fillStyle = data.fillColor;
			painter._bufferContext.fill();
		}

		painter._bufferContext.stroke();

		if (painter._canPickup && data.canPickup &&
			painter._bufferContext.isPointInPath(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
				parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
			painter.emit(SIGNAL_PICKUP_DATA, data);
			painter._canPickup = false;
		}
		painter._bufferContext.closePath();
		painter._bufferContext.restore();
	}

	const drawRect = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();

		let x = parseFloat(data.start.x) + painter._displayArea.sx;
		let y = parseFloat(data.start.y) + painter._displayArea.sy;
		let w = data.width;
		let h = data.height;

		painter._bufferContext.rect(x, y, w, h);
		painter._bufferContext.strokeStyle = data.color;
		if (data.isFill) {
			painter._bufferContext.fillStyle = data.fillColor;
			painter._bufferContext.fill();
		}
		painter._bufferContext.stroke();

		if (painter._canPickup && data.canPickup &&
			painter._bufferContext.isPointInPath(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
				parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
			painter.emit(SIGNAL_PICKUP_DATA, data);
			painter._canPickup = false;
		}

		painter._bufferContext.closePath();
		painter._bufferContext.restore();
	}

	const drawPath = (painter, data) => {
		painter._bufferContext.save();
		painter._bufferContext.beginPath();
		painter._bufferContext.strokeStyle = data.color;

		for (let i = 0; i < data.points.length; i++) {
			let p = data.points[i];
			if (i == 0) {
				painter._bufferContext.moveTo(p.x + painter._displayArea.sx,
					p.y + painter._displayArea.sy);
				continue;
			}
			painter._bufferContext.lineTo(p.x + painter._displayArea.sx,
				p.y + painter._displayArea.sy);
		}
		if (data.isClose) {
			painter._bufferContext.closePath();
		}
		if (data.canTranslate) {
			painter._bufferContext.rotate(data.rotate);
		}

		painter._bufferContext.stroke();

		if (data.isFill) {
			painter._bufferContext.fillStyle = data.fillColor;
			painter._bufferContext.fill();
		}

		if (painter._canPickup && data.canPickup &&
			painter._bufferContext.isPointInPath(parseFloat(painter._mousePoint.x) + painter._displayArea.sx,
				parseFloat(painter._mousePoint.y) + painter._displayArea.sy)) {
			painter.emit(SIGNAL_PICKUP_DATA, data);
			painter._canPickup = false;
		}

		painter._bufferContext.restore();
	}


	//----------------------------------------------------------------------------------------------
	class PainterEventEmitter {
		constructor() {
			this.handler = {};
		}
		on(eventName, callback) {
			this.handler = this.handler || {};
			this.handler[eventName] = this.handler[eventName] || [];
			this.handler[eventName].push(callback);
		}
		emit(eventName, ...arg) {
			if (this.handler[eventName]) {
				for (let i = 0; i < this.handler[eventName].length; i++) {
					this.handler[eventName][i](...arg);
				}
			}
		}
	}

	class PAINTER extends PainterEventEmitter {
		constructor(canvas) {
			super();

			this._canvas = canvas;
			this._context = canvas.getContext('2d');
			this._bufferCanvas = document.createElement('canvas');
			this._bufferCanvas.width = this._canvas.width;
			this._bufferCanvas.height = this._canvas.height;
			this._bufferContext = this._bufferCanvas.getContext('2d');

			this._datas = [];
			this._displayArea = new PAINTER.DisplayArea();

			this._backgroundImage = undefined;
			this._canPickup = false;
			this._mousePoint = new PAINTER.Point();


			//call functions
			this.centerView();
		}

		//-----------------set------------------------
		setBackgroundImage(img) {
			this._backgroundImage = img;
			this.update();
		}

		setCanPickup(val) {
			this._canPickup = val;
		}
		
		setDisplayArea(displayArea){
			this._displayArea = displayArea;
			this.update();
		}

		setBufferCanvasSize(w, h) {
			this._bufferCanvas.width = w;
			this._bufferCanvas.height = h;
			this._bufferContext = this._bufferCanvas.getContext('2d');
			this.clearCanvas();
			this.clearDatas();

			this.centerView();
			this.update();
		}
		
		//-------------------get-------------------------
		getDisplayArea(){
			return this._displayArea;
		}

		//-------------------public API----------------
		drawGraphic() {
			let argLen = arguments.length;
			switch (argLen) {
				case 1:
					if (typeof arguments[0] == "object" &&
						arguments[0].hasOwnProperty("type")) {
						this._datas.push(arguments[0]);
					} else {
						console.error("Arguments erro!");
						return;
					}
					break;
				default:
					console.error("Arguments erro!");
			}
			this.update();
		}

		drawGraphics() {
			let argLen = arguments.length;
			switch (argLen) {
				case 1:
					if (Array.isArray(arguments[0])) {
						this._datas.push.apply(this._datas, arguments[0]);
					} else {
						console.error("Arguments erro!");
						return;
					}
					break;
				default:
					console.error("Arguments erro!");
			}
		}

		saveImage(name, code) {
			let url = this.canvas.toDataURL(code || 'image/png')
			let a = document.createElement('a')
			let event = new MouseEvent('click')
			a.download = name || '图片'
			a.href = url
			a.dispatchEvent(event)
		}

		changeCanvas(canvas) {
			this._canvas = canvas;
			this._context = canvas.getContext('2d');
			this._bufferCanvas.width = this._canvas.width;
			this._bufferCanvas.height = this._canvas.height;
			this._bufferContext = this._bufferCanvas.getContext('2d');
			this.clearCanvas();
			this.clearDatas();

			this.centerView();
			this.update();
		}

		changeCanvasSize(w, h) {
			this._canvas.width = w;
			this._canvas.height = h;
			this.centerView();
			this.update();
		}
		
		changeGraphic(graphic) {
			for (let i = 0; i < this._datas.length; i++) {
				if (graphic.id == this._datas[i].id) {
					this._datas[i] = graphic;
					break;
				}
			}
			this.update();
		}

		centerView() {
			let x = 0;
			let y = 0;
			let w = this._canvas.width;
			let h = this._canvas.height;
			let sx = 0;
			let sy = 0;
			let sw = this._bufferCanvas.width;
			let sh = this._bufferCanvas.height;

			if (sw <= w) {
				w = sw;
				sx = 0;
			} else {
				sx = (sw - w) / 2;
				sw = w;
			}

			if (sh <= h) {
				h = sh;
				sy = 0;
			} else {
				sy = (sh - h) / 2;
				sh = h;
			}

			this._displayArea.x = x;
			this._displayArea.y = y;
			this._displayArea.w = w;
			this._displayArea.h = h;
			this._displayArea.sx = sx;
			this._displayArea.sy = sy;
			this._displayArea.sw = sw;
			this._displayArea.sh = sh;
		}

		clearDatas() {
			this._datas = [];
		}

		clearCanvas() {
			this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
			this._bufferContext.clearRect(0, 0, this._bufferCanvas.width, this._bufferCanvas.height);
		}

		update() {
			drawAll(this);
		}
		//TEST
		go() {
			this.emit("go", [12, 25]);
		}
	}

	PAINTER.Point = function() {
		this.x = 0;
		this.y = 0;
		this.isCheck = false;
		this.judgeIsCheck = function(pX, pY, pR) {
			if (this.x - pR <= pX &&
				this.x + pR >= pX &&
				this.y - pR <= pY &&
				this.y + pR >= pY) {
				this.isCheck = true;
			} else {
				this.isCheck = false;
			}
			return this.isCheck;
		};
		this.axisToCanvas = function(canvas, pX, pY) {
			var bbox = canvas.getBoundingClientRect();
			this.x = parseFloat((pX - bbox.left * (canvas.width / bbox.width)).toFixed(2));
			this.y = parseFloat((pY - bbox.top * (canvas.height / bbox.height)).toFixed(2));
		};
	}

	PAINTER.Line = function() {
		this.type = 'PAINTER.Line';
		this.id = guid();

		this.start = new PAINTER.Point();
		this.end = new PAINTER.Point();
		this.lineWidth = 1;
		this.color = '#000000';
		this.canPickup = false;

		this.name = guid();
		this.subType = ""; //2019年4月27日 14:41:32 添加副类型
	}

	PAINTER.Circular = function() {
		this.type = 'PAINTER.Circular';
		this.id = guid();

		this.center = new PAINTER.Point();
		this.r = 1;
		this.lineWidth = 1;
		this.isFill = true;
		this.isClose = true;
		this.color = '#000000';
		this.fillColor = '#000000';
		this.startAngle = 0;
		this.endAngle = 2 * Math.PI;
		this.counterclockwise = true; //False = 顺时针，true = 逆时针。
		this.name = guid();
		this.canPickup = false;

		this.subType = ""; //2019年4月27日 14:41:32 添加副类型

	}

	PAINTER.Text = function() {
		this.type = 'PAINTER.Text';
		this.id = guid();

		this.center = new PAINTER.Point();
		this.text = '';
		this.rotate = 0;
		this.name = guid();
		this.canPickup = false;
		this.color = "#000000";
		this.fillColor = "#000000";

		//2019年4月3日 16:53:57,
		this.textAlign = "center";
		this.textBaseline = "middle";

		//2019年4月17日 13:53:12
		this.fontSize = 10;
		this.subType = ""; //2019年4月27日 14:41:32 添加副类型
	}

	PAINTER.Arc = function() {
		this.type = 'PAINTER.Arc';
		this.id = guid();

		this.center = new PAINTER.Point();
		this.start = new PAINTER.Point();
		this.end = new PAINTER.Point();
		this.r = 1;
		this.lineWidth = 1;
		this.isClose = false;
		this.color = '#000000';
		this.isFill = false;
		this.fillColor = "#000000";
		this.name = guid();
		this.canPickup = false;
		this.subType = ""; //2019年4月27日 14:41:32 添加副类型

	}

	PAINTER.Rect = function() {
		this.type = 'PAINTER.Rect';
		this.id = guid();

		this.start = new PAINTER.Point();
		this.rotate = 0;
		this.center = new PAINTER.Point();
		this.width = 0;
		this.height = 0;
		this.color = "#000000";
		this.fillColor = "#000000";

		this.isFill = false;
		this.canPickup = false;
		this.name = guid();
		this.canTranslate = false;
		this.isClose = true;
		this.subType = ""; //2019年4月27日 14:41:32 添加副类型
	}

	PAINTER.Path = function() {
		this.type = 'PAINTER.Path';
		this.id = guid();

		this.points = [];
		this.rotate = 0;
		this.center = new PAINTER.Point();

		this.color = "#000000";
		this.fillColor = "#000000";

		this.isFill = false;
		this.canPickup = false;
		this.name = guid();
		this.canTranslate = false;
		this.isClose = false;
		this.subType = ""; //2019年4月27日 14:41:32 添加副类型

	}

	PAINTER.None = function() {
		this.type = 'PAINTER.None';

	}

	PAINTER.DisplayArea = function() {
		this.x = 0;
		this.y = 0;
		this.sx = 0;
		this.sy = 0;
		this.sw = 0;
		this.sh = 0;
		this.w = 0;
		this.h = 0;
	}

	return PAINTER;
})();
