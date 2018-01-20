#!/usr/bin/env node
const Path = require('path');
const AllConfig = require('../configuration')
const Prerender = require('./lib');
const Config = AllConfig[Path.basename(__dirname)]

if (Config.env) {
  Object.keys(Config.env).forEach(function (key) {
    if (Config.env[key]) {
      Object.defineProperty(process.env, key, { value: Config.env[key] });
    }
  })
}

const PrerenderServer = Prerender(Config.main)

if (Config.plugins && Config.plugins.length > 0) {
  Config.plugins.forEach(function (name) {
    PrerenderServer.use(Prerender[name]())
  })
}

PrerenderServer.start();
