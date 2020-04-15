//iNoBounce
(function(global){var startY=0;var enabled=false;var supportsPassiveOption=false;try{var opts=Object.defineProperty({},"passive",{get:function(){supportsPassiveOption=true}});window.addEventListener("test",null,opts)}catch(e){}var handleTouchmove=function(evt){var el=evt.target;var zoom=window.innerWidth/window.document.documentElement.clientWidth;if(evt.touches.length>1||zoom!==1){return}while(el!==document.body&&el!==document){var style=window.getComputedStyle(el);if(!style){break}if(el.nodeName==="INPUT"&&el.getAttribute("type")==="range"){return}var scrolling=style.getPropertyValue("-webkit-overflow-scrolling");var overflowY=style.getPropertyValue("overflow-y");var height=parseInt(style.getPropertyValue("height"),10);var isScrollable=scrolling==="touch"&&(overflowY==="auto"||overflowY==="scroll");var canScroll=el.scrollHeight>el.offsetHeight;if(isScrollable&&canScroll){var curY=evt.touches?evt.touches[0].screenY:evt.screenY;var isAtTop=startY<=curY&&el.scrollTop===0;var isAtBottom=startY>=curY&&el.scrollHeight-el.scrollTop===height;if(isAtTop||isAtBottom){evt.preventDefault()}return}el=el.parentNode}evt.preventDefault()};var handleTouchstart=function(evt){startY=evt.touches?evt.touches[0].screenY:evt.screenY};var enable=function(){window.addEventListener("touchstart",handleTouchstart,supportsPassiveOption?{passive:false}:false);window.addEventListener("touchmove",handleTouchmove,supportsPassiveOption?{passive:false}:false);enabled=true};var disable=function(){window.removeEventListener("touchstart",handleTouchstart,false);window.removeEventListener("touchmove",handleTouchmove,false);enabled=false};var isEnabled=function(){return enabled};var testDiv=document.createElement("div");document.documentElement.appendChild(testDiv);testDiv.style.WebkitOverflowScrolling="touch";var scrollSupport="getComputedStyle"in window&&window.getComputedStyle(testDiv)["-webkit-overflow-scrolling"]==="touch";document.documentElement.removeChild(testDiv);if(scrollSupport){enable()}var iNoBounce={enable:enable,disable:disable,isEnabled:isEnabled};if(typeof module!=="undefined"&&module.exports){module.exports=iNoBounce}if(typeof global.define==="function"){(function(define){define("iNoBounce",[],function(){return iNoBounce})})(global.define)}else{global.iNoBounce=iNoBounce}})(this);

iNoBounce.disable()

/**
 * TiqoL Client JavaScript 0.8 version by m-3.me
 */

function getData(){
	this.getVersion = function(){
		return "0.9";
	}

	this.getName = function(){
		return "TiqoL";
	}
	return this;
}

var STATIC = getData();

function getCookieValue(name){
	var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
	if (match) return match[2];
}

function getUrlVars(){
    var vars = {};
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function TiqoLClient (server_adress , port , no_ssl = false){
	
	this.server_adress = server_adress;
	this.port = port;
	
	secretKey = null;
	this.secretKey = secretKey;

	paketHandler = PaketHandler(this);
	this.paketHandler = paketHandler;
	
	eventHandler = EventHandler(this);
	this.eventHandler = eventHandler;
	
	htmlBuilder = HTMLBuilder(this);
	this.htmlBuilder = htmlBuilder;

	tries_left = 1;
	
	console.log(",--------.,--.                     ,--.");   
	console.log("'--.  .--'`--' ,---.  ,---. ,-----.|  |");    
	console.log("   |  |   ,--.| .-. || .-. |'-----'|  |");    
	console.log("   |  |   |  |' '-' |' '-' '       |  '--."); 
	console.log("   `--'   `--' `-|  | `---'        `-----'"); 
	console.log("                 `--'");                      
	console.log("Starting " + STATIC.getName() + " " + STATIC.getVersion());
	
		
	//Send custom messages
	this.sendCustomPaket = function(json){
		custompaket = this.paketHandler.createPaket("c104" , this.secretKey , json);
		console.log("Sending custom paket " + custompaket);
		socket.send(custompaket);
	}
	
	this.connect = function(){
		console.log("Connecting to " + this.server_adress + ":" + this.port);
		
		if (no_ssl){
			socket = new WebSocket("ws://"+this.server_adress+":"+this.port+"/"); 
		}
		else{
			socket = new WebSocket("wss://"+this.server_adress+":"+this.port+"/"); 
		}
		
		this.socket = socket;
		socket.onopen= function() {
			console.log("Connected.");
			
			//old_secret = getValue("last_secret");
			//old_session = getCookieValue("last_session");
			
			old_secret = window.localStorage.last_secret;
			old_session = window.localStorage.last_session;
						
			if (old_secret && old_session){
				console.log("Sending session-resume handshake paket (c00)");
				socket.send(paketHandler.createPaket("c00" , null , {"resume_session" : true, "secret" : old_secret, "session" : old_session, "version" : STATIC.getVersion()}));
			}else{
				socket.send(paketHandler.createPaket("c00" , null , {"resume_session" : false , "version" : STATIC.getVersion()}));
			}
		};
		socket.onmessage= function(s) {
			paketHandler.handleRawInput(s.data);
		};
		socket.onclose = function(s) {
			window.location = "down.html";
		}
		return false;
	}
	
	return this;
}

function PaketHandler(client){
	
	this.handleRawInput = function(string){
		string = updateReservedVariables(string , client);
		var json =  JSON.parse(string);
		if (json["id"] == "s00"){
			var secret = json["data"]["secret"];
			var session = json["data"]["session"];
			client.eventHandler.securityHandshake(secret , session);
		}
		if (json["id"] == "s01"){
			var htmlarray = json["data"];
			client.eventHandler.rebuildHTML(htmlarray);
		}
		if (json["id"] == "s02"){
			var array = json["data"];
			client.eventHandler.updateHTML(array);
		}
		if (json["id"] == "s03"){
			var tag = json["data"]["tag"];
			client.eventHandler.addHeaderTag(tag);
		}
		if (json["id"] == "s04"){
			client.eventHandler.clearHeaderTags();
		}
		if (json["id"] == "s05"){
			var id = json["data"]["object"];
			client.eventHandler.requestedCanvasBase64(id);
		}
		if (json["id"] == "s06"){
			var id = json["data"]["object"];
			var data = json["data"]["custom_data"];
			client.eventHandler.updateCustomData(id , data);
		}
		if (json["id"] == "s07"){
			var id = json["data"]["object"];
			client.eventHandler.removeObject(id);
		}
		if (json["id"] == "s08"){
			var array = json["data"];
			client.eventHandler.addObjectToBody(array);
		}
		if (json["id"] == "s09"){
			var objectToPut = json["addToObjectID"];
			var object = json["object"];
			client.eventHandler.addChildToObject(objectToPut, object);
		}
		if (json["id"] == "s100"){
			var title = json["data"]["title"];
			client.eventHandler.setTitle(title);
		}
		if (json["id"] == "s101"){
			var message = json["data"]["message"];
			client.eventHandler.messageAlert(message);
		}
		if (json["id"] == "s102"){
			var rythm = json["data"]["rythm"];
			client.eventHandler.vibrate(rythm);
		}
	}

	this.updateReservedVariables = function(data , client){
		data = data.replace(/{tiqoL-authKey}/g , client.secretKey);
		return data;
	}
	
	this.createPaket = function(id , secret , arg_array){
		var paket = { 
			"id" : id,
			"secret" : secret,
			"data" : arg_array
		}
		return JSON.stringify(paket);
	}
	
	return this;
}

function EventHandler(client){
	
	this.securityHandshake = function(secretkey , sessionkey){
		console.log("Security Handshake Paket (s00) received.");
		console.log("New session started: " + sessionkey);
		//document.cookie = "last_session="+sessionkey;
		//document.cookie = "last_secret="+secretkey;
		localStorage.last_session = sessionkey;
		localStorage.last_secret = secretkey;
		client.secretKey = secretkey;
		client.socket.send(client.paketHandler.createPaket("c01" , secretkey , {parameters : getUrlVars()}));
	}
	
	this.rebuildHTML = function(htmlarray){
		var scroll = document.scrollingElement.scrollTop
		client.htmlBuilder.buildByJSON(htmlarray);
		$(window).scrollTop(scroll);
		console.log("Rebuilding website");
	}

	this.updateHTML = function(array){
		client.htmlBuilder.updateObject(array["objectID"] , array["newObject"] , array["keepOldChildren"][0]);
	}

	this.addHeaderTag = function(tag){
		$('head').append(tag);
	}

	this.clearHeaderTags = function(){
		$('head').children().each(function(){
			if ($(this).attr('class') != "keep"){
				$(this).remove();
			}
		});
	}

	this.requestedCanvasBase64 = function(id){
		base64 = client.htmlBuilder.getCanvasBase64(id);
		if (base64 != null){
			client.socket.send(client.paketHandler.createPaket("c103" , localStorage.last_secret , {object : id , img_base64 : base64}));
		}
	}

	this.removeObject = function(id){
		client.htmlBuilder.removeObject(id);
	}

	this.addObjectToBody = function(array){
		client.htmlBuilder.addObjectToBody(array);
	}
	
	this.addChildToObject = function(objectToPut, object){
		client.htmlBuilder.addChildToObject(objectToPut, object);
	}

	this.updateCustomData = function(id, data){
		client.htmlBuilder.updateCustomData(id , data)
	}

	this.messageAlert = function(message){
		alert(message);
	}

	this.setTitle = function(title){
		document.title = title;
	}
	
	this.vibrate = function(rythm){
		window.navigator.vibrate(rythm);
	}

	return this;
}

var HTMLObject = class{
	
	constructor(client , type , id , tiqoltype , customData){
		this.client = client;
		this.type = type;
		this.id = id;
		this.tiqoltype = tiqoltype;
		this.customData = customData;
		this.htmlelement = document.createElement(this.type);
		this.children = [];

		if (this.tiqoltype.startsWith("input_")){
			if (this.tiqoltype == "input_checkbox"){
				$(this.htmlelement).bind('change' , {client : this.client , id : this.id , element : this.htmlelement} , function(event){
					var id = event.data.id;
					var client = event.data.client;

					client.socket.send(client.paketHandler.createPaket("c101" , client.secretKey , {clicked_id : id , checked: event.data.element.checked}));
					console.log("Input occured. Sending packet to server. (c101)"); 
				});
			}
			else if (this.tiqoltype == "input_text"){
				$(this.htmlelement).bind('input' , {client : this.client , id : this.id , element : this.htmlelement} , function(event){
					var id = event.data.id;
					var client = event.data.client;
		
					client.socket.send(client.paketHandler.createPaket("c102" , client.secretKey , {clicked_id : id , text: event.data.element.value}));
					console.log("Input occured. Sending packet to server. (c102)"); 
				});
			}
			else if (this.tiqoltype == "input_multiline_text"){
				$(this.htmlelement).bind('input' , {client : this.client , id : this.id , element : this.htmlelement} , function(event){
					var id = event.data.id;
					var client = event.data.client;
		
					client.socket.send(client.paketHandler.createPaket("c102" , client.secretKey , {clicked_id : id , text: event.data.element.value}));
					console.log("Input occured. Sending packet to server. (c102)"); 
				});
			}
		}

		this.checkCustomData();
	}

	checkCustomData(){
		if (this.customData){
			if (this.customData["drawable"]){
				
				var onlyDiff = false;
				if (this.customData["drawable_onlydiff"]){
					onlyDiff = true;
				}
				
				var canvas, ctx, flag = false,
				prevX = 0,
				currX = 0,
				prevY = 0,
				currY = 0,
				dot_flag = false;

				canvas = this.htmlelement;
				ctx = canvas.getContext("2d");
				var w = canvas.width;
				var h = canvas.height;

				if (this.customData["image"]){
					var image = new Image();
					image.onload = function() {
					  ctx.drawImage(image, 0, 0);
					};
					image.src = this.customData["image"];
				}

				// Set up touch events for mobile, etc
				canvas.addEventListener("touchstart", function (e) {
				  var touch = e.touches[0];
				  var mouseEvent = new MouseEvent("mousedown", {
					clientX: touch.clientX,
					clientY: touch.clientY
				  });
				  canvas.dispatchEvent(mouseEvent);
				}, false);
				canvas.addEventListener("touchend", function (e) {
				  var mouseEvent = new MouseEvent("mouseup", {});
				  canvas.dispatchEvent(mouseEvent);
				}, false);
				canvas.addEventListener("touchmove", function (e) {
				  var touch = e.touches[0];
				  var mouseEvent = new MouseEvent("mousemove", {
					clientX: touch.clientX,
					clientY: touch.clientY
				  });
				  canvas.dispatchEvent(mouseEvent);
				}, false);

				var dataobject = this;

				canvas.addEventListener("mousemove", function (e) {
					findxy('move', e , dataobject)
				}, false);
				canvas.addEventListener("mousedown", function (e) {
					findxy('down', e , dataobject)
				}, false);
				canvas.addEventListener("mouseup", function (e) {
					findxy('up', e , dataobject)
				}, false);
				canvas.addEventListener("mouseout", function (e) {
					findxy('out', e , dataobject)
				}, false);

				function draw(curr) {
					ctx.beginPath();
					ctx.moveTo(prevX, prevY);
					ctx.lineTo(currX, currY);
					ctx.strokeStyle = curr.customData["color"];
					ctx.lineWidth = curr.customData["width"];
					ctx.stroke();
					ctx.closePath();
				}

				function findxy(res, e , curr) {
					e.preventDefault();
	    			e.stopPropagation();
					if (res == 'down') {
						prevX = currX;
						prevY = currY;
							currX = (e.clientX - canvas.getBoundingClientRect().left) / (canvas.clientWidth / canvas.width);
							currY = (e.clientY - canvas.getBoundingClientRect().top) / (canvas.clientHeight / canvas.height);

						flag = true;
						dot_flag = true;
						if (dot_flag) {
							ctx.beginPath();
							ctx.fillStyle = curr.customData["color"];;
							ctx.fillRect(currX, currY, 2, 2);
							ctx.closePath();
							dot_flag = false;
						}
						iNoBounce.enable()
					}
					if (res == 'up' || res == "out") {
						flag = false;
						iNoBounce.disable()
					}
					if (res == 'move') {
						if (flag) {
							prevX = currX;
							prevY = currY;
							currX = (e.clientX - canvas.getBoundingClientRect().left) / (canvas.clientWidth / canvas.width);
							currY = (e.clientY - canvas.getBoundingClientRect().top) / (canvas.clientHeight / canvas.height);
							draw(curr);
						}
						iNoBounce.enable()
					}
				}
			}
		}
	}
	
	setCustomData(data){
		this.customData = data;
	}

	getElement(){
		return this.htmlelement;
	}
	getCustomData(){
		return this.customData;
	}
	getType(){
		return this.type;
	}
	setCSS(css){
		$(this.htmlelement).css(css);
	}
	setInsideText(txt){
		this.htmlelement.innerHTML = txt;
	}
	setAttributes(attributes){
		$(this.htmlelement).attr(attributes);
	}
	addChild(htmlobject){
		this.htmlelement.appendChild(htmlobject.getElement());
		this.children.push(htmlobject);
	}
	putChild(at , htmlobject){
		this.htmlelement.insertBefore(htmlobject.getElement(), this.htmlelement.children[at]);
		this.children.splice(at, 0, htmlobject);
	}
	removeChild(htmlObject){
		var index = this.children.indexOf(htmlObject);
		this.children.splice(index , 1);
		this.getElement().removeChild(htmlObject.getElement());
	}
	getChildren(){
		return this.children;
	}
	setClickable(){
		$(this.htmlelement).bind('click' , {client : this.client , id : this.id} , function(event){
			var id = event.data.id;
			var client = event.data.client;
			
			var offset = $(this).offset();

			client.socket.send(client.paketHandler.createPaket("c100" , client.secretKey , {clicked_id : id , x : event.pageX - offset.left ,
			y : event.pageY - offset.top , pageX : event.pageX , pageY : event.pageY}));

		});
		$(this.htmlelement).bind('contextmenu', {client : this.client , id : this.id} , function(event){
			event.preventDefault();
			var id = event.data.id;
			var client = event.data.client;
			client.socket.send(client.paketHandler.createPaket("c105" , client.secretKey , {clicked_id : id}));
			return false;
		});
	}
}

function createHTMLObject(array , client){
	var htmlobject = new HTMLObject(client , array["type"] , array["id"] , array["tiqoL-type"] , array["customData"]);
	htmlobject.setInsideText(array["insideText"]);
	if ("css" in array){
		htmlobject.setCSS(array["css"]);
	}
	if ("attributes" in array){
		htmlobject.setAttributes(array["attributes"]);
	}
	htmlobject.setAttributes({id : array["id"]});
	var children = array["children"];
	if (array["onclick_action"]){
		htmlobject.setClickable();
	}
	if (children != undefined){
		for (var i = 0; i < children.length; i++) {
			htmlobject.addChild(createHTMLObject(children[i] , client));
		}
	}
	return htmlobject;
}

function HTMLBuilder(client){
	var topobject = null;

	var client = client;

	var direct_access = {};

	this.buildDirectAccess = function(from){
		for (var i = 0; i < from.getChildren().length; i++) {
			direct_access[from.getChildren()[i].id] = from.getChildren()[i];
			buildDirectAccess(from.getChildren()[i]);
		}
	}
	
	this.buildByJSON = function(array){
		iNoBounce.disable()
		topobject = createHTMLObject(array , client);
		document.body = topobject.getElement();
		direct_access = {};
		buildDirectAccess(topobject);
	}

	this.searchParent = function(from , objectID){
		for (var i = 0; i < from.getChildren().length; i++) {
			if (objectID == from.getChildren()[i].id) return from;
		} 
		for (var i = 0; i < from.getChildren().length; i++) {
			x = searchParent(from.getChildren()[i] , objectID)
			if (x != null) return x;
		} 
	}

	this.searchObject = function(from , objectID){
		for (var i = 0; i < from.getChildren().length; i++) {
			if (objectID == from.getChildren()[i].id) return from.getChildren()[i];
		} 
		for (var i = 0; i < from.getChildren().length; i++) {
			x = searchObject(from.getChildren()[i] , objectID)
			if (x != null) return x;
		} 
	}

	this.getCanvasBase64 = function(objectID){
		canvas = searchObject(topobject, objectID);
		if (canvas == null){
			console.log("Server requested base64 of non existing canvas.");
			return;
		}
		if (canvas.tiqoltype != "canvas"){
			console.log("Server requested base64 of non existing canvas.");
			return;
		}
		element = canvas.getElement();
		base64 = element.toDataURL();
		return base64;
	}

	this.updateCustomData = function(objectID , customData){
		object = searchObject(topobject,objectID);
		object.setCustomData(customData);
		console.log("Custom data of object " + objectID + " has been changed.");
		console.log(object);
	}

	this.removeObject = function(id){
		parent = searchParent(topobject,id);
		parent.removeChild(searchObject(topobject,id))
		console.log("HTML Object " + id + "removed by server")
	}
	
	this.addChildToObject = function(objectToPut, object){
		parent = searchObject(topobject , objectToPut);
		parent.addChild(createHTMLObject(object , client));
		buildDirectAccess(topobject);
		console.log("Added a child to object '"+objectToPut+"'")
	}

	this.addObjectToBody = function(array){
		parent = topobject; //parent = body
		addObject = createHTMLObject(array , client);
		parent.addChild(addObject);
		buildDirectAccess(topobject);
		console.log("Appended new HTMLObject to HTML Body");
	}

	this.updateObject = function(objectID , replaceObjectArray , keepOldChildren){

		var position = document.scrollingElement.scrollTop;
		
		replaceObject = createHTMLObject(replaceObjectArray , client);
		oldObject = searchObject(topobject,objectID);

		hadFocus = (oldObject.htmlelement == document.activeElement);
		selectionStart = 0;
		if (oldObject.type == replaceObject.type &&
			oldObject.id == replaceObject.id){
				if (oldObject.type == "input" && oldObject.tiqoltype == "input_text"){
					selectionStart = oldObject.htmlelement.selectionStart;
				}
				if (oldObject.type == "textarea" && oldObject.tiqoltype == "input_multiline_text"){
					selectionStart = oldObject.htmlelement.selectionStart;
				}
			}

		body = topobject;
		parent = searchParent(topobject,objectID);
		old = direct_access[objectID];
		if (parent == null){
			console.log("The object the server requested to update doesn't exist. Requesting an HTML rebuild from server...");
			//TODO request rebuild
			return;
		}

		old_index = parent.getChildren().indexOf(old);

		if (!keepOldChildren){
			old_children = old.children;
			for (var i = 0; i < old_children.length; i++) {
				old.removeChild(old_children[old_children.length-1]);
			}
		}

		parent.removeChild(old);

		if (keepOldChildren){
			old_children = old.children;
			for (var i = 0; i < old_children.length; i++) {
				replaceObject.putChild(0 , old_children[old_children.length-1]);
			}
		}

		parent.putChild(old_index , replaceObject);

		direct_access = {};
		buildDirectAccess(topobject);

		if (oldObject.type == replaceObject.type &&
			oldObject.id == replaceObject.id){
				if (oldObject.type == "input" && oldObject.tiqoltype == "input_text"){
					if (hadFocus) replaceObject.htmlelement.focus();
					replaceObject.htmlelement.selectionStart = selectionStart;
				}	
				if (oldObject.type == "textarea" && oldObject.tiqoltype == "input_multiline_text"){
					if (hadFocus) replaceObject.htmlelement.focus();
					replaceObject.htmlelement.selectionStart = selectionStart;
				}	
			}

		console.log("Updated htmlobject " + old.id + " to " + replaceObject.id);

		$(window).scrollTop(position);
	}

	return this;
}






























