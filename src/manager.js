'use strict';

const { resolve, isAbsolute } = require('path');

const config = require('./util/config');
const TwitchBot = require('./util/twitchbot');
const log = require('./util/log');
const error = require('./util/error');
const onMessages = require('./onMessage');

class Manager {
  constructor ({ monitor = true, monitorInterval = 5000 } = {}) {
    this.config = config();

    this._log = log.bind(this);
    this._error = error.bind(this);

    this.logFile = isAbsolute(this.config.logFile)
      ? this.config.logFile : resolve(process.cwd(), this.config.logFile);

    this.bots = {};
    Object.keys(this.config.bots).forEach(this.create.bind(this));

    if (monitor) {
      this.monitor = setInterval(() => {
        this.log('monitor', 'status', this.status());
      }, monitorInterval);
    }
  }

  create (botName) {
    if (this.has[botName]) {
      this.error('create', 'cannot create bot: already exists', new Error('bot already exists'), { botName });
    }

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

  has (botName) {
    return !!this.bots[botName];
  }

  async exec (botName, botAction, args) {
    if (!this.has(botName)) {
      this.log('exec', 'cannot exec: bot does not exist', { botName, botAction, args });
      return;
    }

    this.log('exec', 'executing action for bot', { botName, botAction, args });
    return this.bots[botName][botAction](...args);
  }

  statusForBot (botName) {
    if (!this.has(botName)) {
      this.log('status', 'cannot get status: bot does not exist', { botName });
      return;
    }

    return this.bots[botName].state;
  }

  status (botName) {
    if (botName) {
      return this.statusForBot(botName);
    }

    const status = {};
    Object.keys(this.bots).forEach(botName => {
      status[botName] = this.statusForBot.bind(this)(botName);
    });

    return status;
  }

  log (action, msg, other) {
    this._log(action, msg, other);
  }

  error (action, msg, err, other) {
    this._error(action, msg, err, other);
  }
}

module.exports = Manager;
