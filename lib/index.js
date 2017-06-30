var cluster = require('cluster'),
  os = require('os'),
  fs = require('fs'),
  path = require('path'),
  http = require('http'),
  _ = require('lodash'),
  util = require('./util'),
  basename = path.basename,
  onExit = require('signal-exit');

// Starts either a server or client depending on whether this is a master or
// worker cluster process
exports = module.exports = function(options) {
  var port = options.port || process.env.SERVER_PORT || 3000;
  var hostname = options.hostname || process.env.SERVER_HOSTNAME || "localhost";

  var server = require('./server');
  options.isMaster = cluster.isMaster;
  options.worker = cluster.worker;
  server.init(options);

  if (cluster.isMaster) {

    var workersPhantomjsPid = {};
    var workerCount = options.workers || process.env.NUM_WORKERS || os.cpus().length;

    for (var i = 0; i < workerCount; i += 1) {
      util.log('[ INFO ] [ WORKER ] starting worker thread : #' + i);
      var worker = cluster.fork();

      worker.on('message', function(msg) {
        workersPhantomjsPid[this.id] = msg['phantomjsPid'];
      });
    }

    cluster.on('exit', function(worker) {
      if (worker.suicide === true || worker.exitedAfterDisconnect === true) return;

      if (workersPhantomjsPid[worker.id]) {
        process.kill(workersPhantomjsPid[worker.id], 'SIGKILL');
        delete workersPhantomjsPid[worker.id];
      }

      util.log('[ INFO ] [ WORKER ] ' + worker.id + ' died, restarting..');
      cluster.fork();
    });
  } else {
    var httpServer = http.createServer(_.bind(server.onRequest, server));

    util.log('[ INFO ] [ HTTP ] Starting server..');
    httpServer.listen(port, hostname, function() {
      util.log('[ SUCCESS ] [ HTTP ] Server started on : http://' + hostname + ':' + port);
    });

    onExit(function() {
      util.log('[ INFO ] [ WORKER ] Terminating : #' + cluster.worker.id);
      server.exit();
    });
  }

  return server;
};

fs.readdirSync(__dirname + '/plugins').forEach(function(filename) {
  if (!/\.js$/.test(filename)) return;
  var name = basename(filename, '.js');

  function load() {
    return require('./plugins/' + name);
  }
  Object.defineProperty(exports, name, {
    value: load
  });
});
