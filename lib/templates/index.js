var fs = require('fs')
var path = require('path')
var jade = require('jade')
var t = require('../translations').t
var log = require('debug')('democracyos:notifier:templates')
var inlineCss = require('inline-css');
var merge = require('mout/object/merge');
var markdown = require('marked');

function _jade(opts, vars, callback) {
  if ('string' === typeof opts) return _jade({ name: opts }, vars, callback)

  if (!opts.name) return callback(new Error('Undefined template name'))

  var name = opts.name
  var lang = t.hasOwnProperty(opts.lang) ? opts.lang : 'en'

  var filePath = path.join(__dirname, './lib/' + name + '.jade')
  var cssPath = path.join(__dirname, './lib/style.css');

  log('looking for mail template [' + name + '] in path: ' + filePath)

  fs.readFile(filePath, { encoding: 'utf-8' }, function (err, template) {
    if (err) return callback(err);
    fs.readFile(cssPath, { encoding: 'utf-8' }, function (err, css) {
      if (err) return callback(err);

      var mail = jade.compile(template,{
        filename: filePath,
        globals: vars
      });

      t.lang(lang);

      var locales = merge({
        t: t,
        markdown: markdown,
        title: t('templates.' + name + '.subject',{config: opts.config}),
        config: opts.config
      },makeLocals(vars));

      log('locales : %o',locales);

      var content = mail(locales);

      inlineCss(content, {
        extraCss: css,
        url: filePath
      }).then(function(html) {
        callback(null, html)
      });
    })
  })
}

function replaceVars(template, vars) {
  if (!vars) return template

  var res = template

  if (res) {
    vars.forEach(function (v) {
      res = res.replace(v.name, v.content)
    })
  }

  return res
}

function makeLocals(vars) {
  log('vars : %j' , vars);

  var res = {};
  if (!vars) return res ;
  vars.forEach(function (v) {
    res[v.name] = v.content;
  })
  return res;
}

module.exports = {
  jade: _jade
}
