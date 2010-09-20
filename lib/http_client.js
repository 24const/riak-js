(function() {
  var Client, CoreMeta, HttpClient, HttpPool, Link, Mapper, Meta, Utils, querystring;
  var __slice = Array.prototype.slice, __bind = function(func, context) {
    return function(){ return func.apply(context, arguments); };
  }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    var ctor = function(){};
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
    child.prototype.constructor = child;
    if (typeof parent.extended === "function") parent.extended(child);
    child.__super__ = parent.prototype;
  };
  Client = require('./client');
  CoreMeta = require('./meta');
  Mapper = require('./mapper');
  Utils = require('./utils');
  HttpPool = require('./http_pool');
  querystring = require('querystring');
  HttpClient = function(options) {
    var _a, host, port;
    _a = ['localhost', 8098];
    host = _a[0];
    port = _a[1];
    CoreMeta.defaults = Utils.mixin(true, CoreMeta.defaults, options);
    this.pool || (this.pool = HttpPool.createPool(((typeof options === "undefined" || options === null) ? undefined : options.port) || port, ((typeof options === "undefined" || options === null) ? undefined : options.host) || host));
    return this;
  };
  __extends(HttpClient, Client);
  HttpClient.prototype.keys = function(bucket) {
    var _a, callback, meta, options;
    options = __slice.call(arguments, 1);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    options.keys = true;
    meta = new Meta(bucket, '', options);
    return this.execute('GET', meta)(__bind(function(data, meta) {
      return this.executeCallback(data.keys, meta, callback);
    }, this));
  };
  HttpClient.prototype.head = function(bucket, key) {
    var _a, callback, meta, options;
    options = __slice.call(arguments, 2);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    meta = new Meta(bucket, key, options);
    return this.execute('HEAD', meta)(__bind(function(data, meta) {
      return this.executeCallback(data, meta, callback);
    }, this));
  };
  HttpClient.prototype.get = function(bucket, key) {
    var _a, callback, meta, options;
    options = __slice.call(arguments, 2);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    meta = new Meta(bucket, key, options);
    return this.execute('GET', meta)(__bind(function(data, meta) {
      return this.executeCallback(data, meta, callback);
    }, this));
  };
  HttpClient.prototype.getAll = function(bucket) {
    var _a, callback, limiter, mapfunc, options;
    options = __slice.call(arguments, 1);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    mapfunc = options.raw ? 'Riak.mapValues' : 'Riak.mapValuesJson';
    limiter = null;
    if (options.withId) {
      mapfunc = options.raw ? function(v) {
        return [[v.key, Riak.mapValues(v)[0]]];
      } : function(v) {
        return [[v.key, Riak.mapValuesJson(v)[0]]];
      };
    }
    if (options.where) {
      limiter = options.where;
      mapfunc = 'Riak.mapByFields';
    }
    return this.map(mapfunc, limiter).run(bucket, callback);
  };
  HttpClient.prototype.count = function(bucket) {
    var _a, callback, options;
    options = __slice.call(arguments, 1);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    return this.map(function(v) {
      return v.not_found ? [] : [1];
    }).reduce(function(v) {
      return [v.length];
    }).run(bucket, callback);
  };
  HttpClient.prototype.walk = function(bucket, key, spec) {
    var _a, callback, linkPhases, options;
    options = __slice.call(arguments, 3);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    linkPhases = spec.map(function(unit) {
      return {
        bucket: unit[0] || '_',
        tag: unit[1] || '_',
        keep: !!unit[2]
      };
    });
    return this.link(linkPhases).reduce({
      language: 'erlang',
      module: 'riak_kv_mapreduce',
      "function": 'reduce_set_union'
    }).map('Riak.mapValuesJson').run(key ? [[bucket, key]] : bucket, options, callback);
  };
  HttpClient.prototype.save = function(bucket, key, data) {
    var _a, callback, meta, options, verb;
    options = __slice.call(arguments, 3);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    data || (data = {});
    meta = new Meta(bucket, key, options);
    meta.data = data;
    verb = key ? 'PUT' : 'POST';
    return this.execute(verb, meta)(__bind(function(data, meta) {
      return this.executeCallback(data, meta, callback);
    }, this));
  };
  HttpClient.prototype.remove = function(bucket, key) {
    var _a, callback, meta, options;
    options = __slice.call(arguments, 2);
    _a = this.ensure(options);
    options = _a[0];
    callback = _a[1];
    meta = new Meta(bucket, key, options);
    return this.execute('DELETE', meta)(__bind(function(data, meta) {
      return this.executeCallback(data, meta, callback);
    }, this));
  };
  HttpClient.prototype.map = function(phase, args) {
    return new Mapper(this, 'map', phase, args);
  };
  HttpClient.prototype.reduce = function(phase, args) {
    return new Mapper(this, 'reduce', phase, args);
  };
  HttpClient.prototype.link = function(phase) {
    return new Mapper(this, 'link', phase);
  };
  HttpClient.prototype.runJob = function(options, callback) {
    options.raw = 'mapred';
    return this.save('', '', options.data, options, callback);
  };
  HttpClient.prototype.ping = function(callback) {
    var meta;
    meta = new Meta('', '', {
      raw: 'ping'
    });
    return this.execute('HEAD', meta)(__bind(function(data, meta) {
      return this.executeCallback(true, meta, callback);
    }, this));
  };
  HttpClient.prototype.stats = function(callback) {
    var meta;
    meta = new Meta('', '', {
      raw: 'stats'
    });
    return this.execute('GET', meta)(__bind(function(data, meta) {
      return this.executeCallback(data, meta, callback);
    }, this));
  };
  HttpClient.prototype.end = function() {
    return this.pool.end();
  };
  HttpClient.prototype.execute = function(verb, meta) {
    return __bind(function(callback) {
      var headers, path, query, queryProps, url;
      url = ("/" + (meta.raw) + "/" + (meta.bucket) + "/" + (meta.key || ''));
      verb = verb.toUpperCase();
      queryProps = {};
      ['r', 'w', 'dw', 'keys', 'props', 'vtag', 'nocache', 'returnbody'].forEach(function(prop) {
        if (meta[prop] !== undefined) {
          return (queryProps[prop] = meta[prop]);
        }
      });
      query = this.stringifyQuery(queryProps);
      path = ("" + (url) + (query ? '?' + query : ''));
      headers = meta.toHeaders();
      this.log("" + (verb) + " " + (path));
      if (verb !== 'GET') {
        headers.Connection = 'close';
      }
      return this.pool.request(verb, path, headers, __bind(function(request) {
        var buffer;
        if (meta.data) {
          request.write(meta.encode(meta.data), meta.contentEncoding);
          delete meta.data;
        }
        buffer = '';
        request.on('response', function(response) {
          response.on('data', function(chunk) {
            return buffer += chunk;
          });
          return response.on('end', __bind(function() {
            meta = meta.loadHeaders(response.headers, response.statusCode);
            buffer = (function() {
              try {
                return buffer.length > 0 ? meta.decode(buffer) : undefined;
              } catch (e) {
                return new Error("Cannot convert response into " + (meta.contentType) + ": " + (e.message) + " -- Response: " + (buffer));
              }
            })();
            if (meta.statusCode === 404) {
              buffer = undefined;
            }
            return callback(buffer, meta);
          }, this));
        });
        return request.end();
      }, this));
    }, this);
  };
  HttpClient.prototype.stringifyQuery = function(query) {
    var _a, key, value;
    _a = query;
    for (key in _a) {
      if (!__hasProp.call(_a, key)) continue;
      value = _a[key];
      if (typeof value === 'boolean') {
        query[key] = String(value);
      }
    }
    return querystring.stringify(query);
  };
  Meta = function() {
    return CoreMeta.apply(this, arguments);
  };
  __extends(Meta, CoreMeta);
  Meta.prototype.mappings = {
    contentType: 'content-type',
    vclock: 'x-riak-vclock',
    lastMod: 'last-modified',
    etag: 'etag',
    links: 'link',
    host: 'host',
    clientId: 'x-riak-clientid'
  };
  Meta.prototype.loadHeaders = function(headers, statusCode) {
    var _a, k, options, v;
    options = {};
    _a = this.mappings;
    for (k in _a) {
      if (!__hasProp.call(_a, k)) continue;
      v = _a[k];
      if (v) {
        if (v === 'link') {
          options[k] = this.stringToLinks(headers[v]);
        } else {
          options[k] = headers[v];
        }
      }
    }
    this.load(Utils.mixin(true, this.usermeta, options));
    this.statusCode = statusCode;
    return this;
  };
  Meta.prototype.toHeaders = function() {
    var _a, headers, k, v;
    headers = {};
    _a = this.mappings;
    for (k in _a) {
      if (!__hasProp.call(_a, k)) continue;
      v = _a[k];
      if (k === 'links') {
        headers[v] = this.linksToString();
      } else {
        if (this[k]) {
          headers[v] = this[k];
        }
      }
    }
    return headers;
  };
  Meta.prototype.stringToLinks = function(links) {
    var result;
    result = [];
    if (links) {
      links.split(',').forEach(function(link) {
        var _a, _b, captures, i;
        captures = link.trim().match(/^<\/(.*)\/(.*)\/(.*)>;\sriaktag="(.*)"$/);
        if (captures) {
          _b = captures;
          for (i in _b) {
            if (!__hasProp.call(_b, i)) continue;
            _a = _b[i];
            captures[i] = decodeURIComponent(captures[i]);
          }
          return result.push(new Link({
            bucket: captures[2],
            key: captures[3],
            tag: captures[4]
          }));
        }
      });
    }
    return result;
  };
  Meta.prototype.linksToString = function() {
    return this.links.map(__bind(function(link) {
      return "</" + (this.raw) + "/" + (link.bucket) + "/" + (link.key) + ">; riaktag=\"" + (link.tag || "_") + "\"";
    }, this)).join(", ");
  };
  Link = function(options) {
    this.bucket = options.bucket;
    this.key = options.key;
    this.tag = options.tag;
    return this;
  };
  module.exports = HttpClient;
})();
