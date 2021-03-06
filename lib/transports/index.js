var nodemailer = require('nodemailer')
var sendgridTransport = require('nodemailer-sendgrid-transport')
var smtpTransport = require('nodemailer-smtp-transport')
var templates = require('../templates')
var t = require('../translations').t
var log = require('debug')('democracyos:notifier:transports')

function createTransport(config) {
  log('Initializing nodemailer API client')
  var opts = config && config.service ? config : undefined
  if (opts && opts.service === 'sendgrid') {
    opts = sendgridTransport({
      auth: {
        api_user: opts.auth.user,
        api_key: opts.auth.pass
      }
    })
  } else if (opts && opts.service === 'smtp') {
    opts = {
      host: opts.smtp.host,
      port: opts.smtp.port,
      auth: opts.auth,
      tls: opts.smtp.tls
    }
    log('Nodemailer smtpTransport loaded with ', opts)
    opts = smtpTransport(opts)
  }
  return nodemailer.createTransport(opts)
}

function sendMail(transport, opts, config, callback) {
  var to = resolveRecipient(opts.to)
  var from = resolveRecipient(opts.from || {
    email: 'noreply@democracyos.org',
    name: 'The DemocracyOS team'
  })

  // get mail body from jade template
  templates.jade({
    name: opts.template,
    lang: opts.lang || opts.defaultLocale,
    config: config
  }, opts.vars, function (err, body) {
    if (err) return callback(err)

    log('Sending email for "%s" job')

    transport.sendMail({
      from: from,
      to: to,
      subject: t('templates.' + opts.template + '.subject',{config:config}),
      html: body
    }, function (err, response) {
      if (err) log('Nodemailer API error: %j', err)
      else log('Nodemailer send successful: %j', response)

      if (callback) callback(err)
    })
  })
}

function resolveRecipient(rec) {
  if ('string' === typeof rec) return rec

  if ('object' === typeof rec) {
    if (rec.name) return rec.name + ' <' + rec.email + '>'
    return rec.email
  }

  if (Array.isArray(rec)) return rec.map(resolveRecipient)

  throw new Error('Invalid or undefined recipient object')
}

/**
 * Module exports
 */
var exports = module.exports = function transports(config) {
  var transport = createTransport(config.mailer)

  exports.mail = function (opts, callback){
    if (!opts.from && config.organizationName && config.organizationEmail) {
      opts.from = {
        email: config.organizationEmail,
        name: config.organizationName
      }
    }
    sendMail(transport, opts, config, callback)
  }
}
