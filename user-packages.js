'use strict'

const jsonist     = require('jsonist')

    , db          = require('./db')

    , registryUrl = 'https://skimdb.npmjs.com/registry/'
    , pkgListUrl  = `${registryUrl}_design/app/_view/byUser?startkey={user}&endkey={user}`

    , cacheTtl    = 1000 * 60 * 1//0 // 10 minutes


const pkgListCache = db.createCache({
    name          : 'userPkgList'
  , ttl           : cacheTtl
  , load          : loadPkgList
})


function loadPkgList (user, callback) {
  let url = pkgListUrl.replace(/\{user\}/g, JSON.stringify(user))

  jsonist.get(url, (err, doc) => {
    if (err)
      return callback(err)

    if (doc && Array.isArray(doc.rows)) {
      let data = doc.rows.map((row) => row.id)
          .filter((pkg) => pkg !== null && pkg !== undefined && pkg !== '')

      return callback(null, JSON.stringify(data))
    }

    callback(new Error('Did not understand response from npm'))
  })
}


function userPackages (user, callback) {
  pkgListCache.get(user, (err, doc) => {
    if (err)
      return callback(err)

    callback(null, JSON.parse(doc))
  })
}


module.exports = userPackages
