var http = require('http');
var fs = require('fs');
var path = require('path');

http.createServer(function (request, response) {
    console.log(request.method + ' ' + request.url);
	
	var filePath = '.' + request.url;
	if (filePath == './')
		filePath = './index.htm';
	
	if (filePath.indexOf('/../') !== -1) {
		response.writeHead(500);
		response.end();
	} else {
		var extname = path.extname(filePath);
		var contentType = 'text/plain';
		switch (extname) {
			case '.js': contentType = 'text/javascript'; break;
			case '.html': contentType = 'text/html'; break;
			case '.css': contentType = 'text/css'; break;
			case '.ogg': contentType = 'audio/ogg'; break;
			case '.wav': contentType = 'audio/wav'; break;
			case '.glslv': contentType = 'x-shader/x-vertex'; break;
			case '.glslf': contentType = 'x-shader/x-fragment'; break;
		}
	
		path.exists(filePath, function(exists) {
			if (exists) {
				fs.readFile(filePath, function(error, content) {
					if (error) {
						response.writeHead(500);
						response.end();
					} else {
						response.writeHead(200, { 'Content-Type': contentType });
						response.end(content, 'utf-8');
					}
				});
			} else {
				response.writeHead(404);
				response.end();
			}
		});
	}
}).listen(8125);

console.log('Server running at http://127.0.0.1:8125/');

