/**
 * TiqoL Client JavaScriot indev version by Philipp Seelos
 */
function getData(){
	this.getVersion = function(){
		return "indev";
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

function TiqoLClient (server_adress , port){
	
	this.server_adress = server_adress;
	this.port = port;
	
	secretKey = null;

	paketHandler = PaketHandler(this);
	this.paketHandler = paketHandler;
	
	eventHandler = EventHandler(this);
	this.eventHandler = eventHandler;
	
	htmlBuilder = HTMLBuilder(this);
	this.htmlBuilder = htmlBuilder;
	
	console.log(",--------.,--.                     ,--.");   
	console.log("'--.  .--'`--' ,---.  ,---. ,-----.|  |");    
	console.log("   |  |   ,--.| .-. || .-. |'-----'|  |");    
	console.log("   |  |   |  |' '-' |' '-' '       |  '--."); 
	console.log("   `--'   `--' `-|  | `---'        `-----'"); 
	console.log("                 `--'");                      
	console.log("Starting " + STATIC.getName() + " " + STATIC.getVersion());
	
	this.connect = function(){
		console.log("Connecting to " + this.server_adress + ":" + this.port);
		socket = new WebSocket("ws://"+this.server_adress+":"+this.port+"/"); 
		this.socket = socket;
		socket.onopen= function() {
			console.log("Connected.");
			
			old_secret = getCookieValue("last_secret");
			old_session = getCookieValue("last_session");
						
			if (old_secret && old_session){
				console.log("Sending session-resume handshake paket (c00)");
				socket.send(paketHandler.createPaket("c00" , null , {"resume_session" : true, "secret" : old_secret, "session" : old_session}));
			}else{
				socket.send(paketHandler.createPaket("c00" , null , {"resume_session" : false}));
			}
		};
		socket.onmessage= function(s) {
			paketHandler.handleRawInput(s.data);
		};
		socket.onclose = function(s) {
			alert("Failed to connect to the Tiqo-L Server on "+ server_adress + ":" + port 
			+ "\n" + s.code);
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
		if (json["id"] == "s100"){
			var title = json["data"]["title"];
			client.eventHandler.setTitle(title);
		}
		if (json["id"] == "s101"){
			var message = json["data"]["message"];
			client.eventHandler.messageAlert(message);
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
		document.cookie = "last_session="+sessionkey;
		document.cookie = "last_secret="+secretkey;
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

	this.messageAlert = function(message){
		alert(message);
	}

	this.setTitle = function(title){
		document.title = title;
	}
	
	return this;
}

var HTMLObject = class{
	
	constructor(client , type , id , tiqoltype){
		this.client = client;
		this.type = type;
		this.id = id;
		this.tiqoltype = tiqoltype;
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
		}
	}
	
	getElement(){
		return this.htmlelement;
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
	}
}

function createHTMLObject(array , client){
	var htmlobject = new HTMLObject(client , array["type"] , array["id"] , array["tiqoL-type"]);
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

	this.updateObject = function(objectID , replaceObjectArray , keepOldChildren){

		var position = document.scrollingElement.scrollTop;
		console.log(position);
		
		replaceObject = createHTMLObject(replaceObjectArray , client);
		oldObject = searchObject(topobject,objectID);

		hadFocus = (oldObject.htmlelement == document.activeElement);
		selectionStart = 0;
		if (oldObject.type == replaceObject.type &&
			oldObject.id == replaceObject.id){
				if (oldObject.type == "input" && oldObject.tiqoltype == "input_text"){
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
			}

		console.log("Updated htmlobject " + old.id + " to " + replaceObject.id);

		$(window).scrollTop(position);
	}

	return this;
}






























