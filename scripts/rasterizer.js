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

var server, service;
var redirectUrl = '';

server = require('webserver').create();

service = server.listen(port, function(request, response) {

		response.statusCode = 200;
		response.write('OK');
		response.write('Does this look right to you?', JSON.stringify(request), JSON.stringify(response));
		return response.close;

		if (request.url == '/healthCheck') {
				response.statusCode = 200;
				response.write('up');
				response.close();
				return;
		}
		if (!request.headers.url) {
				response.statusCode = 400;
				response.write('Error: Request must contain an url header' + "\n");
				response.write('Does this look right to you?' + JSON.stringify(request.headers));
				response.close();
				return;
		}
		
		var url = request.headers.url;
		var path = basePath + (request.headers.filename || (url.replace(new RegExp('https?://'), '').replace(/\//g, '.') + '.png'));
		var delay = request.headers.delay || 0;

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
										'width': request.headers.width,
										'height': request.headers.height
								};
								
								if (request.headers.clipRect) {
										page.clipRect = JSON.parse(request.headers.clipRect);
								}
								for (name in pageSettings) {
										if (value = request.headers[pageSettings[name]]) {
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
