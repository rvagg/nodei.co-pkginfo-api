'use strict'

const level      = require('level')
    , ttl        = require('level-ttl')
    , LevelCache = require('level-ttl-cache')

    , dbLocation = './pkginfo.db'

const db = ttl(level(dbLocation), { checkFrequency: 1000 })

function createCache (options) {
  options.db = db
  return LevelCache(options)
}

module.exports.createCache = createCache