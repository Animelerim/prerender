var Url = require('url');
var CacheManager = require('cache-manager');
var AWS = require('aws-sdk');

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

var S3 = new AWS.S3({
  params: {
    Bucket: process.env.AWS_S3_BUCKET_NAME
  }
});

var S3Service = {
  get: function(key, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = process.env.S3_PREFIX_KEY + '/' + key;
    }

    S3.getObject({
      Key: key
    }, callback);
  },
  set: function(key, value, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = process.env.S3_PREFIX_KEY + '/' + key;
    }

    var request = S3.putObject({
      Key: key,
      ContentType: 'text/html;charset=UTF-8',
      StorageClass: 'REDUCED_REDUNDANCY',
      Body: value
    }, callback);

    if (!callback) {
      request.send();
    }
  }
};

module.exports = {
  init: function() {
    this.cache = CacheManager.caching({
      store: S3Service
    });
  },

  beforePhantomRequest: function(req, res, next) {
    if (req.method !== 'GET') {
      return next();
    }

    var cache_path = this.generatePath(req.prerender.url);

    this.cache.get(cache_path, function(err, result) {

      if (err && err.code == 'NoSuchKey') {
        console.log('[ INFO ] [ AWS ] Cached file not found!');
      }

      if (!err && result) {
        console.log('[ SUCCESS ] [ AWS ] Loaded from cache..');
        return res.send(200, result.Body);
      }

      next();
    });
  },

  afterPhantomRequest: function(req, res, next) {
    if (req.prerender.statusCode !== 200) {
      return next();
    }

    var cache_path = this.generatePath(req.prerender.url);

    console.log('[ INFO ] [ AWS ] Saving to cache..');
    this.cache.set(cache_path, req.prerender.documentHTML, function(err, result) {
      if (err) {
        console.log('[ ERROR ] [ AWS ] Saving error!', err);
      } else {
        console.log('[ SUCCESS ] [ AWS ] Saved to cache..');
      }

      next();
    });
  },

  generatePath: function(url) {
    var parsed = Url.parse(url);

    if (parsed.path == '/') {
      parsed.path = '/index.html'
    }

    return parsed.hostname + parsed.path;
  },
};
