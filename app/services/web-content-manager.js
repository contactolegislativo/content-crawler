const util =  require('util');
const path = require('path');
const async = require('async');
const iconv  = require('iconv-lite');
const request = require('retry-request');
const { ContentManager } = require('./content-manager');

function _expandContent(content, endpoint) {
  let latest = '';
  let trace = [];
  let regex = RegExp(endpoint.url,'g');
  while ((match = regex.exec(content)) !== null) {
    if(latest != match[0]) {
      trace.push({
        url: match[0],
        trace: endpoint.trace,
        handler: endpoint.handler,
        type: endpoint.storage || 'text',
        target: endpoint.target
      });  
    }
    latest = match[0];
  }

  return trace;
}

function _request(url, type, callback) {
  console.log(' Fetching: ', url);
  let _self = this;
  request({
      encoding: null,
      method: 'GET',
      url: url,
      noResponseRetries: 5,
      retries: 5
    }, function(err, response, html) {
      if(!err){
          let decodedHtml = type == 'regular' ? iconv.decode(html, _self.source.site.encoding || 'UTF-8') : html;
          callback(null, decodedHtml);
      } else {
        console.log(`ERROR: ${url} with ${err.code}`);
        callback(err);
      }
  });
}

function _processContent(decodedHtml, endpoint, next) {
  let trace = [];
  for(let i = 0; i < endpoint.trace.length; i++) {
    trace = trace.concat(_expandContent(decodedHtml, endpoint.trace[i]));
  }

  next(null, {
    url: endpoint.url,
    html: decodedHtml,
    handler: endpoint.handler,
    type: endpoint.storage || 'text',
    trace: trace
  });
}

function _fetch(contentManager, baseUrl, endpoint, next) {
  let url = baseUrl + endpoint.url;
  next = next.bind(this);
  if(contentManager.exist(url)) {
    console.log(` Cache ${url}`)
    let buffer = contentManager.read(url);
    let decodedHtml = iconv.decode(buffer, 'UTF-8');
    _processContent(decodedHtml, endpoint, next);
  } else {
    _request.bind(this)(url, endpoint.type, function(err, decodedHtml) {
      if(endpoint.type == 'image') {
        contentManager.storeImage(url, endpoint.target, decodedHtml);
      } else {
        contentManager.store(url, decodedHtml);
      }
      _processContent(decodedHtml, endpoint, next);
    });
  }
}

function _fetchAndExpand(site, endpoint, next) {
  console.log('Processing ' + site + endpoint.url);
  let contentManager = this.contentManager;
  let _self = this;
  _fetch.bind(this)( contentManager, site, endpoint, function(err, content) {
    if(content.handler) {
      this.processor[content.handler](content.url, content.html, this.source.site.baseUrl);
    }
    async.mapSeries(content.trace, _fetchAndExpand.bind(this, site), function(err, content) {
        next(err, content);
    });
    
  });
}

function _expandSequencialEndpoint(start, number, endpoint) {
  let expandedEndpoints = [];
  for(var i = 0; i < number; i++) {
    expandedEndpoints.push({
      url: util.format(endpoint.url, start + i),
      trace: endpoint.trace,
      handler: endpoint.handler
    });
  }
  return expandedEndpoints;
}

function _expandAlphabeticEndpoint(start, number, endpoint) {
  let expandedEndpoints = [];
  for(var i = 0; i < number; i++) {
    expandedEndpoints.push({
      url: util.format(endpoint.url, String.fromCharCode(start.charCodeAt(0) + i)),
      trace: endpoint.trace,
      handler: endpoint.handler
    });
  }
  return expandedEndpoints;
}

function _expandEndpoints(start, number, endpoints) {
  let expandedEndpoints = [];
  
  for(var i = 0; i < endpoints.length; i++) {
    let endpoint = endpoints[i];
    if(endpoint.type == 'alpha') {
      expanded = _expandAlphabeticEndpoint(start, number, endpoint);
      expandedEndpoints = expandedEndpoints.concat(expanded);
    } else {
      expanded = _expandSequencialEndpoint(start, number, endpoint);
      expandedEndpoints = expandedEndpoints.concat(expanded);
    }
  }
  return expandedEndpoints;
}

class WebContentManager {
    constructor(source, destiny, processor) {
      this.source = source;
      this.destiny = destiny;
      this.contentManager = new ContentManager({
        REPOSITORY: destiny
      });
      this.processor = processor;
    }
    
    fetch(start, end, callback) {
      let endpoints = _expandEndpoints(start, end, this.source.site.endpoints);
      let _self = this;
      let _callback = callback;
      async.mapSeries(endpoints, _fetchAndExpand.bind(this, this.source.site.baseUrl), function(err, result) {
        callback();
      });
    }
}

exports.WebContentManager = WebContentManager;