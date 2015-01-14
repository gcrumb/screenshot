/*
 * SlimerJS rasteriser server
 *
 * This starts an HTTP server waiting for screenshot requests
 */
var basePath            = phantom.args[0]; 
var port                = phantom.args[1];
var defaultViewportSize = phantom.args[2];

defaultViewportSize = defaultViewportSize.split('x');
defaultViewportSize = {
		width: ~~defaultViewportSize[0],
		height: ~~defaultViewportSize[1]
};

var pageSettings = ['javascriptEnabled', 'loadImages', 'localToRemoteUrlAccessEnabled', 'userAgent', 'userName', 'password'];

var redirectUrl = '';

var server = require("webserver").create();

var service = server.listen(port, function(request, response) {

		var params = {};

		if (request && typeof request === 'object' && request.method === 'GET'){
				var parseQuery = function(qstr)
				{
						var query = {};
						var a = qstr.split('&');
						for (var i in a)
						{
								var b = a[i].split('=');
								query[decodeURIComponent(b[0])] = decodeURIComponent(b[1]);
						}
						
						return query;
				};

				params = parseQuery(request.queryString);
		}
		if (request && typeof request === 'object' && request.method === 'POST') {
				params = request.form;
		}

		if (request.url == "/healthCheck") {
				response.statusCode = 200;
				response.write("up" + " and running");
				response.close();
				return;
		}
		if (!params || !params.url) {
				response.statusCode = 400;
				response.write('Error: Request must contain an url parameter' + "\n");
				response.write('Does this look right to you?' + "\n" + JSON.stringify(params) + "\n");
				response.close();
				return;
		}
		
		var url = params.url;
		var path = basePath + (params.filename || (url.replace(new RegExp('https?://'), '').replace(/\//g, '.') + '.png'));
		var delay = params.delay || 0;

		var page = require('webpage').create();

		page.onError = function(msg, trace) {
				console.log('Uh-oh',msg);
				trace.forEach(function(item) {
						console.log('Uh-oh', item.file, ':', item.line);
				});
		}

		page.open(url)
				.then(
						function() {
								page.viewportSize = {
										'width': params.width,
										'height': params.height
								};
								
								if (params.clipRect) {
										page.clipRect = JSON.parse(params.clipRect);
								}
								for (name in pageSettings) {
										if (value = params[pageSettings[name]]) {
												value = (value == 'false') ? false : ((value == 'true') ? true : value);
												page.settings[pageSettings[name]] = value;
										}
								}
								window.setTimeout(function () {
										page.render(path, { format: "jpg", quality: 30 });
										response.statusCode = 200;
										response.write('Success: Screenshot saved to ' + path + "\n");
										page.release();
										response.close();
								}, delay);
						
						});

  // must start the response now
//  response.statusCode = 200;
//  response.write('OK');

});
