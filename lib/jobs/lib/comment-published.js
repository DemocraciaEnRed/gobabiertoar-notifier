var db = require('../../db')
var mail = require('../../transports').mail
var log = require('debug')('democracyos:notifier:comment-published')
var name = require('../../utils/name')
var async = require('async')
var jobs = require('../../jobs')

var jobName = 'comment-published'
var jobNameForSingleUser = 'comment-published-single-recipient'
var jobNameForUpdateFeed = require('./update-comment-feed.js').jobName

module.exports = function (opts) {
  db = db(opts.mongoUrl)
  opts.eventsAndJobs[jobName] = jobName
  opts.eventsAndJobs[jobNameForSingleUser] = jobNameForSingleUser

  opts.agenda.define(jobName, function (job, done) {
    var data = job.attrs.data
    log('data recieved : %o',data);
    jobs.process(jobNameForUpdateFeed, data.topic, done)

    db.users.find({ 'notifications.new-comment': true }, function (err, users) {
      if (err) return done(err)

      async.each(users, function(u, cb) {
        jobs.process(jobNameForSingleUser,{
          lang: u.locale,
          topic: data.topic,
          author: data.author,
          comment: data.comment,
          url: data.url,
          to: { name: name.format(u), email: u.email }
        }, cb)
      }, done)
    })
  })

  opts.agenda.define(jobNameForSingleUser, function (job, done) {
    // email and user *will* exist because only a 'topic-public'
    // may trigger this job and that queary already scans the DB
    var data = job.attrs.data

    var params = {
      config: opts,
      lang: data.lang,
      template: jobName,
      to: data.to,
      vars: [
        { name: 'TOPIC', content: data.topic.mediaTitle },
        { name: 'AUTHOR', content: data.author },
        { name: 'COMMENT', content: data.comment.text },
        { name: 'URL', content: data.url },
        { name: 'USERNAME', content: data.to.name }
      ]
    }

    mail(params, done)
  })
}
