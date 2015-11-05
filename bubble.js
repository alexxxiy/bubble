function Bubble(areaId){
	var _self = this;
	
	this.areaId     = getNotStaticElement(areaId); // Контейнер. Это должен быть элемент с position != static, поскольку относительно него будут задаваться координаты

	//Свойства по умолчанию
	this.optionsDefault = {
		textMaxWidth         : 200             // максимальная ширина текстового блока в пикселях (number)
	,	textPadding          : 20              // отступ от края пузыря до текста в пикселях (number)
	,	textAlign            : "center"        // выравнивание текста (string)
	,	fontFamily           : "Comic Sans MS" // семейство шрифтов для текста (string)
	,	fontSize             : 16              // размер шрифта в пикселях (number)
	,	fontColor            : "#000000"       // цвет шрифта (color)
	,	borderWidth          : 1               // ширина границ (number)
	,	borderColor          : "#000000"       // цвет границ (color)
	,	borderRadius         : 40              // радиус скругления углов границ
	,	fill                 : "#FFFFFF"       // цвет заливки (color)
	,	shadowColor          : "#000000"       // цвет тени (color)
	,	shadowH              : 0               // смещение тени по горизонтали (number)
	,	shadowV              : 0               // смещение тени по вертикали (number)
	,	shadowBlurRadius     : 0               // радиус размытия тени (number)
	
	,	tailWidth            : 10              // ширина основания хвоста в пикселях (number)
	,	tailBaseAngle        : undefined       // параметр задает угол исходя из которого будет рассчитана точка основания хвоста на периметре тела (number)
	                                           // по умолчанию точка лежит на персечении прямой от конца хвоста до центра тела и периметра тела
	,	tailP1               : {x: 0, y: 0}    // координаты первой опорной точки кривой Безье для отрисовки хвоста (object)
	,	tailP2               : {x: 0, y: 0}    // координаты второй опорной точки кривой Безье для отрисовки хвоста (object)
	                                           // координаты задаются как коэффициенты длины от начала кривой до ее конца по каждой из координат

	}

	//Объект для свойств создаваемого пузыря, получаемый слиянием свойств по умолчанию + свойства заданные при вызове функции create в параметре optionsCustom
	this.options = {};

	this.create = function(text, xBody, yBody, xTail, yTail, optionsCustom){
		/*
		text           - текст (string)
		xBody, yBody   - координаты для верхнего левого края текстового блока в пикселах, относительно areaId (number)
		xTail, yTail   - координаты конца хвоста в пикселах, относительно areaId (number)
		optionsCustom  - объект со свойствами пузыря, если не задано свойство или вообще объект, то берется из _self.optionsDefault (object)
		*/

		//Обнуляем при создании нового пузыря

		_self.options = {};

		if (!optionsCustom){
			var optionsCustom = {};
		}

		for(option in _self.optionsDefault){
			_self.options[option] = (optionsCustom[option] === undefined) ? _self.optionsDefault[option] : optionsCustom[option];
		}

		//Записываем аргументы в options
		_self.optionAdd("text", text);
		_self.optionAdd("xBody", xBody);
		_self.optionAdd("yBody", yBody);
		_self.optionAdd("xTail", xTail);
		_self.optionAdd("yTail", yTail);

		var html = _self.createHTML(text, xBody, yBody);

		var svg  = _self.createSVG(html);

	}

	//
	//Создаем SVG
	//
	this.createSVG = function(html){
		var xBody = _self.options.xBody;
		var yBody = _self.options.yBody;
		var xTail = _self.options.xTail;
		var yTail = _self.options.yTail;

		var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');

		var bodyWidth  = _self.optionAdd("bodyWidth", _self.options.textWidth + _self.options.textPadding * 2);
		var bodyHeight = _self.optionAdd("bodyHeight", _self.options.textHeight + _self.options.textPadding * 2);

		var offsetX = _self.optionAdd("offsetX", (xBody < xTail) ? 0 : Math.abs(xBody - xTail)); 
		var offsetY = _self.optionAdd("offsetY", (yBody < yTail) ? 0 : Math.abs(yBody - yTail));

		//отступ
		var indent = _self.optionAdd("indent", _self.options.borderWidth + _self.getErValue("bigger", [_self.options.shadowH, _self.options.shadowV]) + _self.options.shadowBlurRadius * 3);

		// Устанавливаем элементу svg атрибуты
		svg.style.position = "absolute";
		svg.style.left     = _self.optionAdd("xSVG", -offsetX -(indent)) + "px";
		svg.style.top      = _self.optionAdd("ySVG", -offsetY -(indent)) + "px";
		
		svg.style.width    = _self.optionAdd("SVGWidth", _self.getSVGSize(xBody, xTail, bodyWidth) + indent * 2) + "px";
		svg.style.height   = _self.optionAdd("SVGHeight", _self.getSVGSize(yBody, yTail, bodyHeight) + indent * 2) + "px";

		//Вычисляем реальный радиус скругления границ
		var realRadius = _self.optionAdd("realRadius", _self.getBorderRadius());

		//Координаты верхнего левого угла тела пузыря в svg-элементе
		var xBodySVG = _self.optionAdd("xBodySVG", offsetX + indent);
		var yBodySVG = _self.optionAdd("yBodySVG", offsetY + indent);

		//Координаты конца хвоста в svg-элементе
		var xTailSVG = _self.optionAdd("xTailSVG", (xTail - xBody - _self.options.xSVG));
		var yTailSVG = _self.optionAdd("yTailSVG", (yTail - yBody - _self.options.ySVG));

		_self.setPoint(svg, xTailSVG, yTailSVG);

		
		// временный элемент path который описывает тело пузыря
		var pathBody = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		// атрибут d для Body
		var dBody = _self.getDForBody(svg, xBodySVG, yBodySVG);
		pathBody.setAttribute("d", dBody);

		//длина периметра тела пузыря
		var bodyPrimeterLength = _self.optionAdd("bodyPrimeterLength", pathBody.getTotalLength());
		//угол
		var tailAngle = _self.getTailAngle();

		// debugger
		//точка на периметре, из которой будет расти хвост
		if(_self.options.tailBaseAngle === undefined){
			var pointTailBase = pathBody.getPointAtLength(tailAngle/360 * pathBody.getTotalLength());
		} else{
			_self.options.tailBaseAngle = _self.options.tailBaseAngle % 360;
			var pointTailBase = pathBody.getPointAtLength(_self.options.tailBaseAngle/360 * pathBody.getTotalLength());
		}

		_self.setPoint(svg, pointTailBase.x, pointTailBase.y);

		// debugger


		var dBodyShadow = _self.getDForBody(svg, xBodySVG + _self.options.shadowH, yBodySVG + _self.options.shadowV);

		// фильтр для тени
		var defs = document.createElementNS("http://www.w3.org/2000/svg", 'defs');
		
		var filter = document.createElementNS("http://www.w3.org/2000/svg", 'filter');
		filter.setAttribute("id", "shadow");

		var feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", 'feGaussianBlur');
		feGaussianBlur.setAttribute("stdDeviation", _self.options.shadowBlurRadius);

		filter.insertAdjacentElement("beforeEnd", feGaussianBlur);
		defs.insertAdjacentElement("beforeEnd", filter);

		// path для тени Body
		var pathBodyShadow = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		pathBodyShadow.setAttribute("d", dBodyShadow);
		pathBodyShadow.setAttribute("filter", "url(#shadow)");
		pathBodyShadow.style.fill = _self.options.shadowColor;

		// path для контура Body
		var pathBodyBorder = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		pathBodyBorder.setAttribute("d", dBody);
		pathBodyBorder.style.stroke      = _self.options.borderColor;
		pathBodyBorder.style.strokeWidth = _self.options.borderWidth;

		// path для фона Body
		var pathBodyFill = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		pathBodyFill.setAttribute("d", dBody);
		pathBodyFill.style.fill = _self.options.fill;

		// вставляем в элемент svg
		svg.insertAdjacentElement("afterBegin", defs);
		svg.insertAdjacentElement("beforeEnd", pathBodyShadow);
		svg.insertAdjacentElement("beforeEnd", pathBodyBorder);
		svg.insertAdjacentElement("beforeEnd", pathBodyFill);

		html.insertAdjacentElement("afterBegin", svg);
	}

	//
	//Метод получения угла между центральной осью ординат и прямой проведенной из центра тела пузыря к точке окончания хвоста
	//
	this.getTailAngle = function(){
		//координаты центра тела пузыря
		var x1 = _self.options.xBodySVG + _self.options.bodyWidth/2;
		var y1 = _self.options.yBodySVG + _self.options.bodyHeight/2;
		//координаты окончания хвоста
		var x2 = _self.options.xTailSVG;
		var y2 = _self.options.yTailSVG;

		var angle = Math.atan((y2-y1)/(x2-x1)) * 180 / Math.PI;

		if (x1 < x2 && y1 > y2){
			return Math.abs(angle);
		} else if (x1 < x2 && y1 < y2){
			return Math.abs(angle) + 90;
		} else if (x1 > x2 && y1 < y2){
			return Math.abs(angle) + 180;
		} else if (x1 > x2 && y1 > y2){
			return Math.abs(angle) + 270;
		}

	}

	//
	//Получение размеров svg-элемента
	//
	this.getSVGSize = function(cBody, cTail, bodyLong){
		if(cTail < cBody){
			return cBody + bodyLong - cTail;
		} else if(cTail <= (cBody + bodyLong)){
			return bodyLong;
		} else {
			return cTail - cBody;
		}
	}

	//
	//Формирование атрибута d для тела пузыря
	//
	this.getDForBody = function(svg, xStart, yStart){
		/*
		svg            - svg-элемент для которого создается path
		xStart, yStart - координаты левого верхнего угла (без учета borderRadius) в рамках svg-элемента
		*/
		var bodyWidth  = _self.options.bodyWidth;
 		var bodyHeight = _self.options.bodyHeight;
 		var radius     = _self.options.realRadius;
 		var svgWidth   = _self.options.SVGWidth
 		var svgHeight  = _self.options.SVGHeight

		//длина прямых частей границ
		var horisontalStreight = (bodyWidth - radius * 2);
		var verticalStreight   = (bodyHeight - radius * 2);

		var d   = "";

		d += "M" + (xStart + bodyWidth/2) + "," + yStart + " ";
		d += "h" + horisontalStreight/2 + ",0" + " ";
		d += " a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius + " ";
		d += "v" + "0," + verticalStreight + " ";
		d += "a" + radius + "," + radius + " 0 0 1 " + (-radius) + "," + radius + " ";
		d += "h" + (-horisontalStreight) + ",0" + " ";
		d += "a" + radius + "," + radius + " 0 0 1 " + (-radius) + "," + (-radius) + " ";
		d += "v" + "0," + (-verticalStreight) + " ";
		d += "a" + radius + "," + radius + " 0 0 1 " + radius + "," + (-radius) + " ";
		d += "z";

		//Проходимся по все углам элемента чтобы при отрисовке path рисунок не обрезался
		//Особенно заметно отсутствие этой строки при большом значении shadowBlurRadius
		d += "M0,0 M" + svgWidth + ",0 M" + svgWidth + "," + svgHeight + " M0," + svgHeight + " ";

		return d;
	}

	//
	//Радиус скругления углов границ
	//
	this.getBorderRadius = function(){
		var width  = _self.options.bodyWidth;
		var height = _self.options.bodyHeight;
		var radius = _self.options.borderRadius;

		// Определяем длину меньшей из границ
		var smallerBorder = _self.getErValue("smaller", [width, height]);

		// Вычисляем реальный радиус скругления углов
		var realBorderRadius = Math.floor(((smallerBorder - radius * 2) > 0) ? radius : smallerBorder / 2);

		return realBorderRadius;

	}

	//
	//Создаем html
	//
	this.createHTML = function(text, xBody, yBody){
		/*
		text           - текст (string)
		xBody
		yBody        - координаты для верхнего левого края текстового блока в пикселах, относительно areaId (number)
		*/

		//создаем общий контейнер для всего пузыря
		var bubbleContainer = document.createElement("div");

		bubbleContainer.style.position = "absolute";
		bubbleContainer.style.display  = "inline-block";
		bubbleContainer.style.maxWidth = _self.options.textMaxWidth + "px";
		bubbleContainer.style.left     = xBody + "px";
		bubbleContainer.style.top      = yBody + "px";

		//создаем элемент для текста
		var textContainer = document.createElement("span");
		textContainer.style.position   = "relative";
		textContainer.style.left       = _self.options.textPadding + "px";
		textContainer.style.top        = _self.options.textPadding + "px";
		
		//стилизуем
		textContainer.style.fontFamily = _self.options.fontFamily;
		textContainer.style.fontSize   = _self.options.fontSize;
		textContainer.style.color      = _self.options.fontColor;
		textContainer.style.textAlign  = _self.options.textAlign;
		textContainer.style.display    = "inline-block";

		// вставляем текст
		textContainer.innerHTML = text;

		//вставляем текстовый контейнер в общий
		bubbleContainer.insertAdjacentElement("beforeEnd",textContainer);

		//вставляем готовый пузырь в переданный родительский элемент
		_self.areaId.insertAdjacentElement("beforeEnd",bubbleContainer);

		//После вставки текстового блока в DOM определяем его фактические ширину и высоту
		var textWidth  = _self.optionAdd("textWidth", parseInt(textContainer.offsetWidth));
		var textHeight = _self.optionAdd("textHeight", parseInt(textContainer.offsetHeight));

		// Фиксируем ширину и высоту текстового контейнера
		textContainer.style.width    = textWidth + "px";
		textContainer.style.height   = textHeight + "px";
		textContainer.style.position = "absolute";		

		//удаляем лишний атрибут у общего контейнера
		bubbleContainer.style.maxWidth = "";

		//возвращаем созданный элемент-контейнер нашего пузыря
		return bubbleContainer;
	}

	//
	//Получить большее или меньшее значение
	//
	this.getErValue = function(type, array){
		/*
		type   - какое значение вернуть - меньшее ("s[maller]") или большее ("b[igger]") (string)
		array  - массив значений для сравнения (array)
		*/

		type = type.substr(0, 1).toLowerCase();

		if (!Array.isArray(array)) return false;

		array.sort(function(a, b){
								  if (a > b) return 1;
								  if (a < b) return -1;
								  });

		if(type == "s"){
			return array[0];
		} else if(type == "b"){
			return array[array.length - 1];
		} else{
			return false;
		}
	}

	//
	//Добавляем свойство в объект options
	//
	this.optionAdd = function(name, value){
		_self.options[name] = value;
		return value;
	}

	//
	//Отладочный метод для добавления точки в svg-элемент
	//
	this.setPoint = function(svg, x, y){
		var circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
		circle.setAttribute("cx", x);
		circle.setAttribute("cy", y);
		circle.setAttribute("r", 2);
		circle.style.fill = "green";

		svg.insertAdjacentElement("beforeEnd", circle);
	}
}

//
//Проверка свойства position элемента
//Если position у переданного элемента равно "static", то возвращается первый родительский элемент с position != "static"
//
function getNotStaticElement(elem){
	var position = getComputedStyle(elem).position;

	while(position == "static" && elem.tagName != "BODY"){
		elem = elem.parentNode;
	}

	return elem;
}

// Полифиллы insertAdjacent* для FireFox 
if (typeof HTMLElement != "undefined" && !HTMLElement.prototype.insertAdjacentElement){
    HTMLElement.prototype.insertAdjacentElement = function(where, element) {
        switch (where){
            case 'beforeBegin':
                this.parentNode.insertBefore(element, this);
            break;

            case 'afterBegin':
                this.insertBefore(element, this.firstChild);
            break;
            
            case 'beforeEnd':
                this.appendChild(element);
            break;
      
            case 'afterEnd':
                if (this.nextSibling){
                    this.parentNode.insertBefore(element, this.nextSibling);
                } else {
                    this.parentNode.appendChild(element);
                }
            break;
        }
    }
}

if (typeof SVGElement != "undefined" && !SVGElement.prototype.insertAdjacentElement){
    SVGElement.prototype.insertAdjacentElement = function(where, element) {
        switch (where){
            case 'beforeBegin':
                this.parentNode.insertBefore(element, this);
            break;

            case 'afterBegin':
                this.insertBefore(element, this.firstChild);
            break;
            
            case 'beforeEnd':
                this.appendChild(element);
            break;
      
            case 'afterEnd':
                if (this.nextSibling){
                    this.parentNode.insertBefore(element, this.nextSibling);
                } else {
                    this.parentNode.appendChild(element);
                }
            break;
        }
    }
}


if (typeof HTMLElement != "undefined" && !HTMLElement.prototype.insertAdjacentHTML){
    HTMLElement.prototype.insertAdjacentHTML = function(where, htmlStr) {
        var r = this.ownerDocument.createRange();
        r.setStartBefore(this);
        var parsedHTML = r.createContextualFragment(htmlStr);
        this.insertAdjacentElement(where, parsedHTML);
    }
}

if (typeof SVGElement != "undefined" && !SVGElement.prototype.insertAdjacentHTML){
    SVGElement.prototype.insertAdjacentHTML = function(where, htmlStr) {
        var r = this.ownerDocument.createRange();
        r.setStartBefore(this);
        var parsedHTML = r.createContextualFragment(htmlStr);
        this.insertAdjacentElement(where, parsedHTML);
    }
}

if (typeof HTMLElement != "undefined" && !HTMLElement.prototype.insertAdjacentText){
    HTMLElement.prototype.insertAdjacentText = function(where, txtStr) {
        var parsedText = document.createTextNode(txtStr);
        this.insertAdjacentElement(where, parsedText);
    }
}

if (typeof SVGElement != "undefined" && !SVGElement.prototype.insertAdjacentText){
    SVGElement.prototype.insertAdjacentText = function(where, txtStr) {
        var parsedText = document.createTextNode(txtStr);
        this.insertAdjacentElement(where, parsedText);
    }
}
