var url = require("url");
var util = require("../util");

module.exports = {
  init: function() {
    this.ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS && process.env.ALLOWED_DOMAINS.split(',')) || [];
  },
  beforePhantomRequest: function(req, res, next) {
    var parsed = url.parse(req.prerender.url);

    if (this.ALLOWED_DOMAINS.indexOf(parsed.hostname) > -1) {
      next();
    } else {
      util.log('[ INFO ] [ WHITELIST ] Skipping url..');
      res.send(404);
    }
  }
}
