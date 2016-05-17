var db = require('../../db')
var mail = require('../../transports').mail
var log = require('debug')('democracyos:notifier:forgot')
var name = require('../../utils/name')

var jobName = 'reset-password'

module.exports = function (opts) {
  db = db(opts.mongoUrl)
  opts.eventsAndJobs['forgot-password'] = jobName

  opts.agenda.define(jobName, function (job, done) {
    var data = job.attrs.data

    db.users.findOne({ email: data.to }, function (err, user) {
      if (err) return done(err)
      if (!user) return done(new Error('user not found for email \'%s\'', data.email))

      var params = {
        template: job.attrs.name,
        to: {
          email: user.email,
          name: name.format(user)
        },
        config: opts,
        lang: user.locale,
        vars: [
          { name: 'USERNAME', content: user.firstName },
          { name: 'RESET', content: data.resetUrl }
        ]
      }

      mail(params, done)
    })
  })
}
