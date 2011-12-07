(function($) {
/*var _super = $.ajaxSettings.xhr;
$.ajaxSettings.xhr = function() {
	var xhr = _super();
	var getAllResponseHeaders = xhr.getAllResponseHeaders;
	xhr.getAllResponseHeaders = function() {
		try {
		if (getAllResponseHeaders())
			return getAllResponseHeaders();
		} catch (e) {
			console.log(e);
		}
		var headers = '';
		var names = ['Content-Length', 'ETag', 'Cache-Control', 'Content-Language', 'Content-Type', 'Expires', 'Last-Modified', 'Pragma']
		$(names).each(function(i, name) {
			if (xhr.getResponseHeader(name))
				headers += name + ': ' + xhr.getResponseHeader(name) + '\n';
		});
		return headers;
	};
	return xhr;
};*/
$.ravenDb = function(server) {
		//this.server = server || 'http://localhost:8080/';
		this.server = server || 'http://p6400-xp:8080/';
		this.database = 'Default';
	};
	$.ravenDb.create = function(server) {
		return new $.ravenDb(server);
	};
	$.ravenDb.prototype = {
		headersToIgnore: [
			// Entity headers - those are NOT ignored
			/*
			"content-disposition",
			"content-encoding",
			"content-language",
			"content-location",
			"content-md5",
			"expires",
			*/
			"content-type", // always the same for documents, no point in accepting it
			"origin",
			"allow",
			"content-range",
			"last-modified",
			// Ignoring this header, since it may
			// very well change due to things like encoding,
			// adding metadata, etc
			"content-length",
			"content-encoding",
			// Special things to ignore
			"keep-alive",
			"x-requested-with",
			// Request headers
			"accept-charset",
			"accept-encoding",
			"accept",
			"accept-language",
			"authorization",
			"cookie",
			"x-aspnet-version",
			"x-powered-by",
			"x-sourcefiles",
			"expect",
			"from",
			"host",
			"if-match",
			"if-modified-since",
			"if-none-match",
			"if-range",
			"if-unmodified-since",
			"max-forwards",
			"referer",
			"te",
			"user-agent",
			//Response headers
			"accept-ranges",
			"age",
			"allow",
			"etag",
			"location",
			"retry-after",
			"server",
			"set-cookie2",
			"set-cookie",
			"vary",
			"www-authenticate",
			// General
			"cache-control",
			"connection",
			"date",
			"pragma",
			"trailer",
			"transfer-encoding",
			"upgrade",
			"via",
			"warning",
		],
		lucene: function(text) {
			// todo: escape lucene string
			return text;
		},
		ajax: function(opts, ext) {
			$.ajax($.extend(opts, {
				url: this.server + opts.url,
				dataType: 'json',
				data: $.extend(opts.data, {
					noCache: +new Date()
				})
			}, ext));
			return this;
		},
		buildVersion: function(opts) {
			return this.ajax({
				url: 'build/version'
			}, opts);
		},
		stats: function(opts) {
			return this.ajax({
				url: 'stats'
			}, opts);
		},
		databases: function(opts) {
			return this.ajax({
				url: 'databases'
			}, opts);
		},
		docs: function(opts) {
			var start = opts.start;
			delete opts.start;
			return this.ajax({
				url: 'docs',
				data: {
					start: start,
					pageSize: 25
				}
			}, opts);
		},
		doc: function(opts) {
			var id = opts.id;
			delete opts.id;
			return this.ajax({
				url: 'docs/' + id,
			}, opts);
		},
		getMetadata: function(text) {
			var headers = {};
			var lines = text.replace(/\r\n/g, '\n').split('\n');
			for (var i = 0, n = lines.length; i < n; ++i) {
				var line = lines[i];
				var index = line.indexOf(': ');
				if (index != -1) {
					var key = line.substring(0, index);
					if ($.inArray(key.toLowerCase(), this.headersToIgnore) == -1)
						headers[key] = line.substr(index + 2);
				}
			}
			return headers;
		},
		saveDoc: function(opts) {
			var id = opts.id;
			delete opts.id;
			var etag = opts.etag;
			delete opts.etag;
			var meta = opts.meta;
			delete opts.meta;
			var json = opts.json;
			delete opts.json;
			$.ajax($.extend({
				type: id != null ? 'PUT' : 'POST',
				url: this.server + 'docs/' + (id != null ? id : ''),
				contentType: 'application/json',
				data: JSON.stringify(json),
				cache: false,
				beforeSend: function(xhr) {
					if (etag)
						xhr.setRequestHeader('If-None-Match', etag); 
					if (meta)
						for (var key in meta)
							xhr.setRequestHeader(key, meta[key]);
				}
			}, opts));
		},
		deleteDoc: function(opts) {
			var id = opts.id;
			delete opts.id;
			var etag = opts.etag;
			delete opts.etag;
			$.ajax($.extend({
				type: 'DELETE',
				url: this.server + 'docs/' + id,
				cache: false,
				beforeSend: function(xhr) {
					xhr.setRequestHeader("If-None-Match", etag);
				}
			}, opts));
		},
		collections: function(opts) {
			return this.ajax({
				url: 'terms/Raven/DocumentsByEntityName',
				data: {
					field: 'Tag',
					fromValue: '',
					pageSize: 100
				}
			}, opts);
		},
		collection: function(opts) {
			var start = opts.start;
			delete opts.start;
			var pageSize = opts.hasOwnProperty('pageSize') ? opts.pageSize : 25;
			var index = opts.index;
			delete opts.index;
			return this.ajax({
				url: 'indexes/Raven/DocumentsByEntityName',
				data: {
					query: 'Tag:' + this.lucene(index),
					start: start,
					pageSize: pageSize,
					aggregation: 'None'
				}
			}, opts);
		},
		indexes: function(opts) {
			return this.ajax({
				url: 'indexes',
				data: {
					namesOnly: true,
					start: 0,
					pageSize: 256
				}
			}, opts);
		},
		logs: function(opts) {
			return this.ajax({
				url: 'logs'
			}, opts);
		}
	};
})(jQuery);

var colorProvider = {
	goldenAngle: 0.381966,
	colors: {},
	colorsCount: 0,
	baseHues: {},
	baseHuesCount: 0,
	colorFrom: function(key) {
		if (!this.colors[key]) {
			var s = 1.0;
			var v = 0.66;
			var h = this.baseHueFor(key);
			this.colors[key] = this.colorFromHsv(h, s, v);
		}
		return this.colors[key];
	},
	baseHueFor: function(key) {
		if (!this.baseHues[key]) {
			var index = this.baseHuesCount + 1;
			var angle = index * this.goldenAngle;
			var hue = angle % 1;
			this.baseHues[key] = hue;
			++this.baseHuesCount;
		}
		return this.baseHues[key];
	},
	colorFromHsv: function(hue, saturation, value) {
		var hi = (0|hue * 6) % 6;
		value *= 255;
		var v = 0|value;
		var p = 0|v * (1 - saturation);
		var q = 0|v * (1 - hue * saturation);
		var t = 0|v * (hue * saturation);
		switch (hi) {
			case 0: return 'rgb(' + [v, t, p].join(',') + ')';
			case 1: return 'rgb(' + [q, v, p].join(',') + ')';
			case 2: return 'rgb(' + [p, v, t].join(',') + ')';
			case 3: return 'rgb(' + [p, q, v].join(',') + ')';
			case 4: return 'rgb(' + [t, p, v].join(',') + ')';
			default: return 'rgb(' + [v, p, q].join(',') + ')';
		}
	}
};

var docPanel = function(opts) {
	this.url = opts.url;
	delete opts.url;
	this.prefix = '#' + opts.prefix + '-';
	delete opts.prefix;
	this.page = opts.page;
	delete opts.page;
	this.maxPage = opts.maxPage;
	delete opts.maxPage;
	this.docs = opts.docs || function(res) { return res; };
	delete opts.docs;
	this.opts = opts;
};
docPanel.create = function(el, opts) {
	return new docPanel(el, opts).init();
};
docPanel.prototype = {
	page: 0,
	goPage: function(dif) {
		var me = this;
		return function() {
			var page = Math.max(0, Math.min(me.maxPage(), me.page() + dif));
			studio.go(me.url(page));
			return false;
		};
	},
	init: function() {
		var me = this;
		var prefix = this.prefix;
		$(prefix + 'edit-doc').click(function() {
			var id = prompt('Document ID?');
			if (id)
				studio.go(pages.documents_document.url(id));
			return false;
		});
		$(prefix + 'create-doc').click(function() {
			studio.go(pages.documents_document.url());
			return false;
		});
		var $paging = $(prefix + 'paging');
		$paging.children('b').eq(0).mousedown(this.goPage(-1));
		$paging.children('b').eq(1).mousedown(this.goPage(1));
		$(studio).on('stats', function(stats) {
			$paging.children('i').text('Page ' + (me.page() + 1) + ' of ' + (me.maxPage(0|(studio.getCountOfDocuments() - 1) / 25) + 1));
		});
		return this;
	},
	handle: function() {
		var me = this;
		return {
			start: me.page() * 25,
			success: function(res) {
				var docs = me.docs(res);
				$(me.prefix + 'paging').children('i').text('Page ' + (me.page() + 1) + ' of ' + (me.maxPage() + 1));
				var $docs = $(me.prefix + 'docs-list');
				$docs.html('');
				$.each(docs, function() {
					//<li><a href="#"><span>datetimeitems <span>3</span></span></a></li>
					var id = this['@metadata']['@id'];
					var index = id.indexOf('/');
					var head, tail;
					if (index != -1) {
						head = id.substr(0, index);
						tail = id.substr(index + 1);
					} else {
						head = id;
						tail = '';
					}
					$docs.append(
						$('<li>').append(
							$('<a>')
								.prop('href', '#')
								.click(function() {
									return false;
								})
								.dblclick(function() {
									studio.go(pages.documents_document.url(id));
									return false;
								})
								.append(
									$('<span>').text(head).css('border-left-color', colorProvider.colorFrom(this['@metadata']['Raven-Entity-Name']))
										.append(document.createTextNode(' '))
										.append($('<span>').text(tail))
										.append(
											$('<a>')
												.prop('href', '#')
												.addClass('edit')
												.click(function() {
													studio.go(pages.documents_document.url(id));
													return false;
												})
										)
								)
						)
					);
				});
			},
			error: function() {
				console.log('error');
			}
		}
	}
};

var server = $.ravenDb.create();

var pages = {
	summary: {
		url: function(page) {
			return server.database + '/summary' + (page ? '?page=' + (page + 1) : '');
		},
		show: function(args) {
			var me = this;
			this.maxPage = 0|(studio.getCountOfDocuments() - 1) / 25;
			this.page = Math.max(0, Math.min(this.maxPage, (args.page ? args.page : 1) - 1));
			studio.show($('#page-summary'));
			if (!this.init) {
				this.init = true;
				this.docPanel = docPanel.create({
					prefix: 'summary',
					url: this.url,
					page: function(val) { return arguments.length ? (me.page = val) : me.page },
					maxPage: function(val) { return arguments.length ? (me.maxPage = val) : me.maxPage }
				});
			}
			server.docs(this.docPanel.handle());
		}
	},

	collections: {
		url: function(page) {
			return server.database + '/collections?name=' + studio.uriParam(this.selected) + (page ? '&page=' + (page + 1) : '');
		},
		select: function(index) {
			this.selected = index;
			server.collection($.extend(
				this.docPanel.handle(), {
					index: index,
					start: this.page * 25
				}
			));
		},
		maxPage: 1,
		show: function(args) {
			var me = this;
			this.page = Math.max(0, Math.min(this.maxPage, (args.page ? args.page : 1) - 1));
			if (this.selected)
				this.select(this.selected);
			if (!this.init || !args.name)
				server.collections({
					success: function(res) {
						var $ul = $('#collections-list');
						$ul.html('');
						$.each(res, function() {
							var index = String(this);
							var span;
							$ul.append(
								$('<li>').append(
									$('<a>')
										.prop('href', '#')
										.append($('<i>').css('background', colorProvider.colorFrom(index)))
										.append(
											$('<span>')
												.text(index)
												.append(span = $('<span>').text('\xa0'))
										)
										.click(function() {
											me.selected = index;
											studio.go(me.url(0));
											return false;
										})
								)
							);
							if (!me.selected)
								me.select(index);
							server.collection({
								index: index,
								start: 0,
								pageSize: 0,
								success: function(res) {
									span.text(res.TotalResults);
								},
								error: function() {
									console.log('error');
								}
							});
						});
					},
					error: function() {
						console.log('error');
					}
				});
			if (!this.init) {
				this.init = true;
				this.docPanel = docPanel.create({
					prefix: 'collections',
					url: function() { return me.url.apply(me, arguments); },
					docs: function(res) { me.maxPage = 0|(res.TotalResults - 1) / 25; return res.Results; },
					page: function(val) { return arguments.length ? (me.page = val) : me.page },
					maxPage: function(val) { return arguments.length ? (me.maxPage = val) : me.maxPage }
				});
			}
			if (!me.selected)
				me.select(me.selected);
			studio.show($('#page-collections'));
		}
	},

	indexes: {
		show: function() {
			if (!this.init) {
				this.init = true;
				$('#indexes-add').click(function() {
					studio.go(pages.indexes_define.url());
					return false;
				});
				$('#indexes-query').click(function() {
					studio.go(pages.indexes_query.url());
					return false;
				});
			}
			server.indexes({
				success: function(res) {
					var $ul1 = $('#indexes-auto-list');
					var $ul2 = $('#indexes-list');
					var ul1, ul2;
					$ul1.html('');
					$ul2.html('');
					$.each(res, function() {
						var index = String(this);
						var $ul = index.substr(0, 5) == 'Auto/' ? ul1 = $ul1 : ul2 = $ul2;
						$ul.append(
							//<li><a href="#">ApplicationAuthorizations</a> <a href="#">Edit</a></li>
							$('<li>')
								.append(
									$('<a>')
										.prop('href', '#' + pages.indexes_query.url(index))
										.text(index)
								)
								.append(document.createTextNode(' '))
								.append(
									$('<a>')
										.prop('href', '#' + pages.indexes_define.url(index))
										.text('Edit')
								)
						);
					});
					$ul1.add($ul1.prev()).toggle(!!ul1);
					$ul2.add($ul2.prev()).toggle(!!ul2);
				},
				error: function() {
					console.log('error');
				}
			});
			studio.show($('#page-indexes'));
		}
	},
	
	indexes_define: {
		url: function(name) {
			return server.database + '/indexes/define' + (name ? '?name=' + studio.uriParam(name) : '');
		},
		show: function() {
			studio.show($('#page-define'));
		}
	},
	
	indexes_query: {
		url: function(name) {
			return server.database + '/indexes/query' + (name ? '?name=' + studio.uriParam(name) : '');
		},
		show: function() {
			studio.show($('#page-query'));
		}
	},

	documents: {
		url: function(page) {
			return server.database + '/documents' + (page ? '?page=' + (page + 1) : '');
		},
		show: function(args) {
			var me = this;
			this.maxPage = 0|(studio.getCountOfDocuments() - 1) / 25;
			this.page = Math.max(0, Math.min(this.maxPage, (args.page ? args.page : 1) - 1));
			studio.show($('#page-documents'));
			if (!this.init) {
				this.init = true;
				this.docPanel = docPanel.create({
					prefix: 'documents',
					url: this.url,
					page: function(val) { return arguments.length ? (me.page = val) : me.page },
					maxPage: function(val) { return arguments.length ? (me.maxPage = val) : me.maxPage }
				});
			}
			server.docs(this.docPanel.handle());
		}
	},
	
	documents_document: {
		url: function(id) {
			return server.database + '/documents/document' + (id ? '?id=' + studio.uriParam(id) : '');
		},
		view: 'data',
		show: function(args) {
			var me = this;
			var id = args.id;
			studio.show($('#page-document'));
			if (!this.init) {
				this.init = true;
				var dataEditor = $('#document-data-editor').parent();
				var metaEditor = $('#document-meta-editor').parent();
				metaEditor.hide();
				
				this.dataEditor = ace.edit('document-data-editor');
				this.dataEditor.setTheme('ace/theme/vs');
				this.dataEditor.renderer.setShowGutter(false);

				this.metaEditor = ace.edit('document-meta-editor');
				this.metaEditor.setTheme('ace/theme/vs');
				this.metaEditor.renderer.setShowGutter(false);

				var JavaScriptMode = require('ace/mode/json').Mode;
				this.dataEditor.getSession().setMode(new JavaScriptMode());
				this.metaEditor.getSession().setMode(new JavaScriptMode());
				
				$('#document-all').click(function() {
					studio.go(pages.documents.url());
					return false;
				});
				$('#document-tabs a').eq(0).click(function() {
					$('#document-tabs a').removeClass('selected');
					me.view = 'data';
					$(this).addClass('selected');
					metaEditor.hide();
					dataEditor.show();
					me.dataEditor.renderer.onResize(true);
					return false;
				});
				$('#document-tabs a').eq(1).click(function() {
					$('#document-tabs a').removeClass('selected');
					me.view = 'meta';
					$(this).addClass('selected');
					metaEditor.show();
					dataEditor.hide();
					me.metaEditor.renderer.onResize(true);
					return false;
				});
				$('#document-save').click(function() {
					server.saveDoc({
						id: id,
						etag: me.etag,
						meta: JSON.parse(me.metaEditor.getSession().getValue()),
						json: JSON.parse(me.dataEditor.getSession().getValue()),
						success: function() {
							console.log('success');
						},
						error: function() {
							console.log('error');
						}
					});
					return false;
				});
				$('#document-reformat').click(function() {
					var editor = me.view == 'data' ? me.dataEditor : me.metaEditor;
					var session = editor.getSession();
					session.setValue(JSON.stringify(JSON.parse(session.getValue()), null, '\t'));
					return false;
				});
				$('#document-refresh').click(function() {
					studio.go(pages.documents_document.url(id));
					return false;
				});
				$('#document-delete').click(function() {
					if (confirm('Really delete ' + id + '?'))
						server.deleteDoc({
							id: id,
							etag: me.etag,
							success: function() {
								console.log('success');
								studio.go(pages.documents.url());
							},
							error: function() {
								console.log('error');
							}
						});
					return false;
				});
			}
			this.dataEditor.renderer.onResize(true);
			this.metaEditor.renderer.onResize(true);
			$('#document-h2').text(id ? id : 'New Document');
			$('#document-id').val(id);
			if (id)
				server.doc({
					id: id,
					success: function(res, status, xhr) {
						me.etag = xhr.getResponseHeader('ETag');
						me.contentLength = xhr.getResponseHeader('Content-Length');
						me.dataEditor.getSession().setValue(JSON.stringify(res, null, '\t'));
						var metadata = server.getMetadata(xhr.getAllResponseHeaders());
						me.metaEditor.getSession().setValue(JSON.stringify(metadata, null, '\t'));
						var $metadata = $('#document-metadata');
						$metadata.html('');
						for (var x in metadata)
							$metadata
								.append($('<dt>').text(x))
								.append($('<dd>').text(metadata[x]));
					},
					error: function() {
						console.log('error');
					}
				});
		}
	},

	tasks: {
		show: function() {
			studio.show($('#page-tasks'));
		}
	},
	
	logs: {
		show: function() {
			studio.show($('#page-logs'));
			server.logs({
				success: function(res) {
					var $tbody = $('#logs-tbody');
					$tbody.html('');
					$.each(res, function() {
						$tbody.append(
							$('<tr>')
								.append($('<td>').addClass('ico').addClass(this.Level.toLowerCase()))
								.append($('<td>').text(this.Level))
								.append($('<td>').text(studio.formatDate(this.TimeStamp)))
								.append($('<td>').text(this.Message))
								.append($('<td>').text(this.Exception || ''))
								.append($('<td>').text(this.LoggerName))
						);
					});
				},
				error: function() {
					console.log('error');
				}
			});
		}
	},
	
	about: {
		show: function() {
			studio.show($('#page-about'));
		}
	},

	databases: {
		show: function() {
			server.databases({
				success: function(res) {
					var $ul = $('#databases-list');
					$ul.html('');
					$.each(res, function() {
						var database = this['@metadata']['@id'];
						var prefix = 'Raven/Databases/'
						if (database.substr(0, prefix.length) == prefix)
							database = database.substr(prefix.length);
						//<li><a href="#">Default <span>654 documents</span></a></li>
						$ul.append(
							$('<li>')
								.append(
									$('<a>')
										.prop('href', '#' + pages.summary.url())
										.text(database + ' ')
										.append($('<span>').text('\xa0'))
								)
						);
					});
				},
				error: function() {
					console.log('error');
				}
			});
			studio.show($('#page-databases'));
		}
	}
};

var url = {
	parseSearch: function(search) {
		var args = {};
		if (search.charAt(0) == '?')
			search = search.substr(1);
		for (var i = 0, x = search.split('&'), n = x.length; i < n; ++i) {
			var pair = x[i].split('=');
			if (pair[0])
				args[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
		}
		return args;
	},
	createSearch: function(args) {
		var search = [];
		for (var x in args)
			if (args.hasOwnProperty(x))
				search.push([studio.uriParam(x), studio.uriParam(args[x])].join('='));
		return search.length ? '?' + search.join('&') : '';
	}
};

var studio = {
	page: $('#content>div'),
	menu: $(),
	formatDate: function(date) {
		date = new Date(date);
		var pad = function(x) { return (x < 10 ? '0' : '') + x; };
		return [
			[pad(date.getDate()), pad(date.getMonth()+1), date.getFullYear()].join('.'),
			[pad(date.getHours()), pad(date.getMinutes()+1), pad(date.getSeconds())].join(':')
		].join('\xa0');
	},
	show: function(page) {
		this.page.hide();
		this.page = page.show();
	},
	create: function() {
		var me = this;
		server
			.buildVersion({
				success: function(res) {
					$('#foot span').text('Build #' + res.BuildVersion);
				},
				error: function() {
					console.log('error');
				}
			})
			.stats({
				success: function(res) {
					studio.stats = res;
					var values = [
						{ label: 'documents', count: res.CountOfDocuments },
						{ label: 'indexes', count: res.CountOfIndexes },
						{ label: 'stale', count: res.StaleIndexes.length },
						{ label: 'errors', count: res.Errors.length },
						{ label: 'triggers', count: res.Triggers.length },
						{ label: 'tasks', count: res.ApproximateTaskCount }
					];
					$('#foot a').slice(1, -1).each(function(index) {
						var value = values[index];
						$(this).text(value.count + ' ' + value.label);
					});
					$(studio).trigger('stats', res);
				},
				error: function() {
					console.log('error');
				}
			});
		$(document).click(function(e) {
			var $target = $(e.target);
			if ($target.is('a')) {
				var href = $target.attr('href');
				if (href.substr(0, 1) == '#' ) {
					me.go(href.substr(1), true);
					return false;
				}
			}
		});
		$(window).on('hashchange', function() {
			me.go(location.hash.substr(1), false);
		});
		this.setDatabase(server.database);
		this.go(pages.summary.url());
		return this;
	},
	setDatabase: function(database) {
		$('#menu a').each(function() {
			var $this = $(this);
			var section = $this.attr('data-section');
			if (!section)
				$this.attr('data-section', $this.attr('href').substr(1));
			$this.attr('href', '#' + database + '/' + $this.attr('data-section'));
		});
	},
	getCountOfDocuments: function() {
		return this.stats ? this.stats.CountOfDocuments : 0;
	},
	go: function(hash, same) {
		if (location.hash != '#' + hash) {
			location.hash = '#' + hash;
			return;
		}
		var me = this;
		if (!hash)
			return;
		var searchIndex = hash.indexOf('?');
		var path = searchIndex != -1 ? hash.substr(0, searchIndex) : hash;
		var search = searchIndex != -1 ? hash.substr(searchIndex + 1) : '';
		var parts = path.split('/');
		var args = url.parseSearch(search);
		server.database = parts.shift();
		this.controller = parts[0];
		$('#menu a').each(function() {
			var $this = $(this);
			if ($this.attr('href') == '#' + server.database + '/' + me.controller) {
				me.menu.removeClass('selected');
				me.menu = $this.parent().addClass('selected');
			}
		});
		var page = pages[parts.join('_')];
		if (page)
			page.show(args);
	},
	uriParam: function(parameter) {
		return encodeURIComponent(parameter).replace(/%2f/gi, '/');
	}
};
studio.create();