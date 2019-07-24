var csp = require('..')

var assert = require('assert')
var express = require('express')
var parseCsp = require('content-security-policy-parser')
var request = require('supertest')
var AGENTS = require('./browser-data')

var POLICY = {
  defaultSrc: ["'self'"],
  'script-src': ['scripts.biz'],
  styleSrc: ['styles.biz', function (req, res) {
    return res.locals.nonce
  }],
  objectSrc: ["'none'"],
  imgSrc: ['data:'],
  mediaSrc: false,
  prefetchSrc: ['prefetch.example.com'],
  reportTo: '/report',
  requireSriFor: ['script'],
  upgradeInsecureRequests: true
}

var EXPECTED_POLICY = {
  'default-src': ["'self'"],
  'script-src': ['scripts.biz'],
  'style-src': ['styles.biz', 'abc123'],
  'object-src': ["'none'"],
  'img-src': ['data:'],
  'prefetch-src': ['prefetch.example.com'],
  'report-to': ['/report'],
  'require-sri-for': ['script'],
  'upgrade-insecure-requests': []
}

describe('normal browsers', function () {
  beforeEach(function () {
    this.app = express()

    this.app.use(function (req, res, next) {
      res.locals.nonce = 'abc123'
      next()
    })

    this.app.use(csp({ directives: POLICY }))

    this.app.use(function (req, res) {
      res.end('Hello world!')
    })
  })

  Object.keys(AGENTS).forEach(function (name) {
    var agent = AGENTS[name]

    if (agent.special) { return }

    it('sets the header properly for ' + name, function (done) {
      request(this.app).get('/').set('User-Agent', agent.string)
        .end(function (err, res) {
          if (err) { return done(err) }

          var header = agent.header.toLowerCase()
          assert.deepStrictEqual(parseCsp(res.headers[header]), EXPECTED_POLICY)

          done()
        })
    })

    it('does not set other headers for ' + name, function (done) {
      request(this.app).get('/').set('User-Agent', agent.string)
        .end(function (err, res) {
          if (err) { return done(err) }

          [
            'content-security-policy',
            'x-content-security-policy',
            'x-webkit-csp'
          ].forEach(function (header) {
            if (header === agent.header.toLowerCase()) { return }
            assert.strictEqual(res.headers[header], undefined)
          })

          done()
        })
    })
  })
})
