const level      = require('level')
    , ttl        = require('level-ttl')
    , LevelCache = require('level-ttl-cache')

    , dbLocation = './pkginfo.db'

var db = level(dbLocation)

db = ttl(db, { checkFrequency: 1000 })

function createCache (options) {
  options.db = db
  return LevelCache(options)
}

module.exports.createCache = createCache