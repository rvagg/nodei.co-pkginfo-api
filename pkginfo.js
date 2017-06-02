'use strict'

const jsonist     = require('jsonist')
    , qs          = require('querystring')
    , after       = require('after')
    , db          = require('./db')

    , registryUrl = 'https://skimdb.npmjs.com/registry/'
    , dependedUrl = `${registryUrl}_design/app/_view/dependedUpon?`

    , ttls        = {
          doc       : 1000 * 60 * 1  // 1 minute
        , depends   : 1000 * 60 * 60 // 1 hour
      }


let dependsCache
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
  let query = {
          group_level : 3
        , startkey    : JSON.stringify([ pkg ])
        , endkey      : JSON.stringify([ pkg, {} ])
        , skip        : 0
        //, limit       : 1000
      }
    , url = dependedUrl + qs.stringify(query)

  jsonist.get(url, afterDependsGet)

  function afterDependsGet (err, doc) {
    if (err)
      return callback(err)

    if (!doc.rows)
      return callback(new Error('bad dependedUpon document'))

    callback(null, String(doc.rows.length))
  }
}


function loadDoc (pkg, callback) {
  function afterDocGet (err, doc) {
    if (err)
      return callback(err)

    let version
      , latest

    if (doc.error)
      return callback(new Error(`registry error: ${doc.error} (${(doc.reason || 'reason unknown')})`))

    if (!doc.name)
      return callback(new Error(`no name field found for ${pkg}`))
    if (!doc['dist-tags'])
      return callback(new Error(`no dit-tags found for ${pkg}`))
    if (!(version = doc['dist-tags'].latest))
       return callback(new Error(`no dist-tags.latest found for ${pkg}`))
    version = version.replace(/^v/, '') // skimdb weirdness, seen in node-sass
    if (!doc.time[version])
      return callback(new Error(`no version time for ${pkg}@${version}`))

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
  }

  jsonist.get(registryUrl + pkg, afterDocGet)
}


function pkginfo (pkg, options, callback) {
  let doc
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

  docCache.get(pkg, afterDocCacheGet)

  function afterDocCacheGet (err, _doc) {
    if (!err)
      doc = JSON.parse(_doc)
    done(err)
  }

  if (!options.nodepends && !options.mini) {
    done.count++
    process.nextTick(deferredDependsCacheLoad)

    let deferredDependsCacheLoad = () => {
      //FIXME: LevelCache seems to need a nextTick
      dependsCache.get(pkg, afterDependsCacheGet)

      function afterDependsCacheGet (err, _depended) {
        if (!err)
          depended = parseInt(_depended, 10)
        done(err)
      }
    }
  }
}


module.exports = pkginfo
