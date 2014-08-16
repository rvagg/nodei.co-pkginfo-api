const http           = require('http')
    , fs             = require('fs')
    , url            = require('url')
    , querystring    = require('querystring')
    , Router         = require('routes-router')
    , bole           = require('bole')
    , uuid           = require('node-uuid')
    , sendJson       = require('send-data/json')
    , sendError      = require('send-data/error')
    , pkginfo        = require('./pkginfo')

    , log            = bole('server')
    , reqLog         = bole('server:request')

    , isDev          = (/^dev/i).test(process.env.NODE_ENV)
    , port           = process.env.PORT || 3000
    , start          = new Date()


bole.output({
  level  : isDev ? 'debug' : 'info',
  stream : process.stdout
})

if (process.env.LOG_FILE) {
  console.log('Starting logging to %s', process.env.LOG_FILE)
  bole.output({
    level  : 'debug',
    stream : fs.createWriteStream(process.env.LOG_FILE)
  })
}


process.on('uncaughtException', function (err) {
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
  var qs = querystring.parse(url.parse(req.url).query)
  pkginfo(opts.params.pkg, qs, sendData(req, res))
}


var router = Router({
    errorHandler: function (req, res, err) {
      req.log.error(err)
      sendError(req, res, err)
    }

  , notFound: function (req, res) {
      sendJson(req, res, {
          body: { 'error': 'Not found: ' + req.url }
        , statusCode: 404
      })
    }
})


router.addRoute('/info/:pkg', pkgInfoRoute)


function handler (req, res) {
  if (req.url == '/_status')
    return sendJson(req, res, { body: { ok: true }, statusCode: 200 })

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

    log.info('Server started on port %d', port)
    console.log()
    console.log('>> Running: http://localhost:' + port)
    console.log()
  })