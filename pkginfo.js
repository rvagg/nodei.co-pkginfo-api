const jsonist     = require('jsonist')
    , qs          = require('querystring')
    , after       = require('after')
    , db          = require('./db')
    , log         = require('bole')('db')

    , registryUrl = 'https://skimdb.npmjs.com/registry/'
    , dependedUrl = registryUrl + '_design/app/_view/dependedUpon?'

    , ttls        = {
          doc       : 1000 * 60 * 1  // 1 minute
        , depends   : 1000 * 60 * 60 // 1 hour
      }


var dependsCache
  , docCache


docCache = db.createCache({
    name          : 'doc'
  , ttl           : ttls.doc
  , load          : loadDoc
})

dependsCache = db.createCache({
    name          : 'depends'
  , ttl           : ttls.depends
  , load          : loadDepends
})


function loadDepends (pkg, callback) {
  var query = {
          group_level : 3
        , startkey    : JSON.stringify([ pkg ])
        , endkey      : JSON.stringify([ pkg, {} ])
        , skip        : 0
        //, limit       : 1000
      }
    , url = dependedUrl + qs.stringify(query)

  jsonist.get(url, function (err, doc) {
    if (err)
      return callback(err)

    if (!doc.rows)
      return callback(new Error('bad dependedUpon document'))
    callback(null, String(doc.rows.length))
  })
}


function loadDoc (pkg, callback) {
  jsonist.get(registryUrl + pkg, function (err, doc) {
    if (err)
      return callback(err)

    var version
      , latest

    if (doc.error)
      return callback(new Error(
          'registry error: '
          + doc.error
          + ' ('
          + (doc.reason || 'reason unknown')
          + ')'))

    if (!doc.name) return callback(new Error('no name found'))
    if (!doc['dist-tags']) return callback(new Error('no dit-tags found'))
    if (!(version = doc['dist-tags'].latest))
       return callback(new Error('no dist-tags.latest found'))
    if (!doc.time[version]) return callback(new Error('no version time'))

    latest = doc.versions && doc.versions[version]

    callback(null, JSON.stringify({
        name         : doc.name
      , version      : version
      , updated      : new Date(doc.time[version])
      , dependencies : latest && latest.dependencies
          && Object.keys(latest.dependencies).length || 0
      , stars        : doc.users && Object.keys(doc.users).length
      , preferGlobal : latest && latest.preferGlobal
    }))
  })
}


function pkginfo (pkg, options, callback) {
  var doc
    , depended
    , done = after(1, _done)

  if (typeof options == 'function') {
    callback = options
    options = {}
  }

  function _done (err) {
    if (err)
      return callback(err)
    if (!doc)
      return callback(new Error('Could not fetch doc from npm'))

    doc.depended = depended
    callback(null, doc)
  }

  docCache.get(pkg, function (err, _doc) {
    if (!err)
      doc = JSON.parse(_doc)
    done(err)
  })

  if (!options.nodepends && !options.mini) {
    done.count++
    process.nextTick(function () {
      //FIXME: LevelCache seems to need a nextTick
      dependsCache.get(pkg, function (err, _depended) {
        if (!err)
          depended = parseInt(_depended, 10)
        done(err)
      })
    })
  }
}


module.exports = pkginfo
