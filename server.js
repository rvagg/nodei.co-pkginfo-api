'use strict'

const http           = require('http')
    , fs             = require('fs')
    , url            = require('url')
    , querystring    = require('querystring')
    , Router         = require('routes-router')
    , bole           = require('bole')
    , uuid           = require('node-uuid')
    , sendJson       = require('send-data/json')
    , sendPlain      = require('send-data/plain')
    , sendError      = require('send-data/error')
    , pkginfo        = require('./pkginfo')
    , userPackages   = require('./user-packages')

    , log            = bole('server')
    , reqLog         = bole('server:request')

    , isDev          = (/^dev/i).test(process.env.NODE_ENV)
    , port           = process.env.PORT || 3000
    , start          = new Date()

    // inherited from nodei.co/lib/valid-name.js
    , pkgregex       = '@?\\w*/?[^/@\\s\\+%:]+'


bole.output({
  level  : isDev ? 'debug' : 'info',
  stream : process.stdout
})

if (process.env.LOG_FILE) {
  console.log(`Starting logging to ${process.env.LOG_FILE}`)
  bole.output({
    level  : 'debug',
    stream : fs.createWriteStream(process.env.LOG_FILE)
  })
}


process.on('uncaughtException', (err) => {
  log.error(err)
  process.exit(1)
})


function sendData (req, res) {
  return function (err, data) {
    if (err)
      return sendError(req, res)

    sendJson(req, res, { body: data, statusCode: 200 })
  }
}


function pkgInfoRoute (req, res, opts) {
  let qs = querystring.parse(url.parse(req.url).query)
    , k

  for (k in qs) {
    if (qs[k] == 'false')
      qs[k] = false
    else if (qs[k] == 'true')
      qs[k] = true
  }

  res.setHeader('cache-control', 'no-cache')

  pkginfo(opts.params.pkg, qs, sendData(req, res))
}


function userPackagesRoute (req, res, opts) {
  userPackages(opts.params.user, sendData(req, res))
}


const router = Router({
    errorHandler: (req, res, err) => {
      req.log.error(err)
      sendError(req, res, err)
    }

  , notFound: (req, res) => {
      sendJson(req, res, {
          body: { 'error': 'Not found: ' + req.url }
        , statusCode: 404
      })
    }
})


router.addRoute(`/info/:pkg(${pkgregex})` , pkgInfoRoute)
router.addRoute('/user-packages/:user'    , userPackagesRoute)


function handler (req, res) {
  if (req.url == '/_status')
    return sendPlain(req, res, 'OK')

  // unique logger for each request
  req.log = reqLog(uuid.v4())
  req.log.info(req)

  res.setHeader('x-startup', start)
  res.setHeader('x-powered-by', 'whatevs')

  router(req, res)
}


http.createServer(handler)
  .on('error', function (err) {
    log.error(err)
    throw err
  })
  .listen(port, function (err) {
    if (err) {
      log.error(err)
      throw err
    }

    log.info(`Server started on port ${port}`)
    console.log()
    console.log(`>> Running: http://localhost:${port}`)
    console.log()
  })
