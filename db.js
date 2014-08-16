const level      = require('level')
    , sublevel   = require('level-sublevel')
    , ttl        = require('level-ttl')
    , LevelCache = require('level-ttl-cache')

    , dbLocation = './pkginfo.db'

var db = level(dbLocation)

db = sublevel(db)
db = ttl(db, { checkFrequency: 1000 })

function createCache (options) {
  options.db = db
  return LevelCache(options)
}

module.exports.createCache = createCache