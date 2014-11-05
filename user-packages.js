const jsonist     = require('jsonist')

    , db          = require('./db')

    , registryUrl = 'https://skimdb.npmjs.com/registry/'
    , pkgListUrl  = registryUrl + '_design/app/_view/byUser?startkey={user}&endkey={user}'

    , cacheTtl    = 1000 * 60 * 2 // 2 minutes


var pkgListCache = db.createCache({
    name          : 'userPkgList'
  , ttl           : cacheTtl
  , load          : loadPkgList
})


function loadPkgList (user, callback) {
  var url = pkgListUrl.replace(/\{user\}/g, JSON.stringify(user))

  jsonist.get(url, function (err, doc) {
    if (err)
      return callback(err)

    if (doc && Array.isArray(doc.rows)) {
      var data = doc.rows.map(function (row) {
        return row.id
      }).filter(function (pkg) {
        return pkg !== null && pkg !== undefined && pkg !== ''
      })
      return callback(null, JSON.stringify(data))
    }

    callback(new Error('Did not understand response from npm'))
  })
}


function userPackages (user, callback) {
  pkgListCache.get(user, function (err, doc) {
    if (err)
      return callback(err)

    callback(null, JSON.parse(doc))
  })
}


module.exports = userPackages