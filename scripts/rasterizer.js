/*
 * SlimerJS rasteriser server
 *
 * This starts an HTTP server waiting for screenshot requests
 */

var basePath            = phantom ? phantom.args[0] : "/tmp/screencaps"; 
var port                = phantom ? phantom.args[1] : 5440;
var defaultViewportSize = phantom ? phantom.args[2] : "1280x800";

defaultViewportSize = defaultViewportSize.split("x");
defaultViewportSize = {
		width: ~~defaultViewportSize[0],
		height: ~~defaultViewportSize[1]
};

var pageSettings = ["javascriptEnabled", "loadImages", "localToRemoteUrlAccessEnabled", "userAgent", "userName", "password"];

var redirectUrl = "";

var parseQuery = function (querystring) {
  // remove any preceding url and split
  querystring = querystring.substring(querystring.indexOf('?')+1).split('&');
  var params = {}, pair, d = decodeURIComponent;
  // march and parse
  for (var i = querystring.length - 1; i >= 0; i--) {
    pair = querystring[i].split('=');
    params[d(pair[0])] = d(pair[1]);
  }

  return params;
};

var server = require("webserver").create();

var service = server.listen(port, function(request, response) {

		var params = parseQuery(request.queryString);

		if (request.method === 'POST'){
				params = request.form;
		}

		if (request.url === "/healthCheck") {
				response.statusCode = 200;
				response.write("up" + " and running\n" +  JSON.stringify(params));
				response.close();
		}

		if (!params.url) {
				response.statusCode = 200;
				response.write("Error: Request must contain an url parameter" + "\n");
				response.write("Does this look right to you?" + "\n" + JSON.stringify(params) + "\n");
				response.close();
				return;
		}
		if (!params.width){
				params.width  = defaultViewportSize.width;
				params.height = defaultViewportSize.height;
		}
		var url   = params.url;
		var stub  = basePath + url.replace(new RegExp("https?://"), "").replace(/\//g, ".") + ".png";
		var path  = params.filename ? basePath + params.filename : stub;
														
		var delay = params.delay ? params.delay : 0;

		var page  = require("webpage").create();

		page.onError = function(msg, trace) {
				console.log("Uh-oh",msg);
				trace.forEach(function(item) {
						console.log("Uh-oh", item.file, ":", item.line);
				});
		}

		page.open(url)
				.then(
						function() {
								page.viewportSize = {
										"width": params.width,
										"height": params.height
								};
								
								if (params.clipRect) {
										page.clipRect = JSON.parse(params.clipRect);
								}
								for (name in pageSettings) {
										if (value = params[pageSettings[name]]) {
												value = (value == "false") ? false : ((value == "true") ? true : value);
												page.settings[pageSettings[name]] = value;
										}
								}
								window.setTimeout(function () {
										page.render(path, { format: "jpg", quality: 60 });
										response.statusCode = 200;
										response.write("Success: Screenshot saved to " + path + "\n");
										page.release();
										response.close();
								}, delay);
						
						});

  // must start the response now
  response.statusCode = 200;
  response.write("OK");
	response.close();


});
