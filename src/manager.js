'use strict';

const { resolve, isAbsolute } = require('path');

const config = require('./util/config');
const TwitchBot = require('./util/twitchbot');
const log = require('./util/log');
const error = require('./util/error');
const onMessages = require('./onMessage');

class Manager {
  constructor () {
    this.config = config();

    this._log = log.bind(this);
    this._error = error.bind(this);

    this.logFile = isAbsolute(this.config.logFile)
      ? this.config.logFile : resolve(process.cwd(), this.config.logFile);

    this.bots = {};
    Object.keys(this.config.bots).forEach(this.create.bind(this));
  }

  create (botName) {
    const botConfig = this.config.bots[botName];

    if (botConfig.create) {
      this.log('create', 'creating bot', { botName });
      this.bots[botName] = new TwitchBot({
        ...botConfig,
        onMessage: onMessages[botName]
      });

      if (botConfig.autoConnect) {
        this.log('create', 'auto connecting', { botName });
        this.bots[botName].connect();
      } else {
        this.log('create', 'skipping auto connect', { botName });
      }
    } else {
      this.log('create', 'skipping bot creation', { botName });
    }
  }

  log (action, msg, other) {
    this._log(action, msg, other);
  }

  error (action, msg, err, other) {
    this._error(action, msg, err, other);
  }
}

module.exports = Manager;
