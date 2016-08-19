'use strict';

const util = require('story-utils');
const command = util.command;
const process = util.process;
const fs = require('story-fs');

const help = require('./include/help');
const generate = require('./include/generate');
const destroy = require('./include/destroy');
const convert = require('./include/convert');

function bootstrap() {
  fs.readJSON('./package.json', 'utf8').then(function(data) {
    process.setTitle(data.name);

    let cmd = null;

    if (process.argv) {
      cmd = command.minimist(process.argv(), {
        'alias': {
          'convert': 'c',
          'destroy': 'd',
          'generate': 'g',
          'help': 'h',
          'new': 'n'
        }
      });
    } else {
      cmd = {help: true};
    }

    let cwd = process.cwd();

    if (cmd.cwd && typeof cmd.cwd !== 'boolean') {
      cwd = cmd.cwd;
      console.log(cwd);
    }

    if (cmd.generate) {
      generate().then(process.goodbye);
    }

    if (cmd.new) {
      console.log('create website item');
    }

    if (cmd.destroy) {
      return destroy(['./content/posts/*', './content/archive/*'])
          .then(process.goodbye);
    }

    if (cmd.convert) {
      console.log('convert post to etc system.');
      return convert(cmd);
    }

    if (cmd.help) {
      help.show();
    }

  }).catch(function(err) {
    process.exit(1, err);
  });

  return true;
}

module.exports = bootstrap;