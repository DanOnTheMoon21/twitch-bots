'use strict';

const Tmi = require('tmi.js');
const { resolve, isAbsolute } = require('path');

const log = require('./log');
const error = require('./error');

async function noop () {}

class TwitchBot {
  constructor ({ user, token, channels = [], onMessage = noop, logFile } = {}) {
    if (!user || !token) {
      throw new Error('Failed to create bot. Missing required info.');
    }

    // info
    this.user = user;
    this.token = token;
    this.channels = channels;
    this.onMessageHandler = onMessage.bind(this);
    this._log = log.bind(this);
    this._error = error.bind(this);

    // create log file
    this.logFile = isAbsolute(logFile)
      ? logFile : resolve(process.cwd(), logFile);

    // create client
    // eslint-disable-next-line new-cap
    this.client = new Tmi.client({
      connection: {
        reconnect: true,
        secure: true
      },
      identity: {
        username: this.user,
        password: this.token
      },
      channels: this.channels
    });

    // create state
    this.state = {
      connected: false,
      listening: false,
      messagesSeen: 0,
      messagesSent: 0,
      logs: 0,
      errors: 0,
      time: {
        connected: undefined,
        init: Date.now(),
        disconnected: undefined,
        messageSeen: undefined,
        messageSent: undefined,
        error: undefined,
        log: undefined,
        listen: undefined,
        dontlisten: undefined
      }
    };
  }

  // wraps the given onMessage handler with our own
  // to update state and whatnot
  async onMessage (channel, userstate, message, self) {
    // if me, do nothing
    if (self) {
      return;
    }

    // update state
    this.state.time.messageSeen = Date.now();
    this.state.messagesSeen++;

    // log message
    this.log('onMessage', 'message received', { channel, userstate, message });

    // @todo: add helper message parsing, etc

    // call on Message handler
    await this.onMessageHandler(channel, userstate, message);
  }

  // this should never be called, since we should always explicitly
  // connect and disconnect. this listener will be removed prior to
  // disconnecting manually.
  async onDisconnected (reason) {
    // cleanup state
    this.state.time.disconnected = Date.now();
    this.state.connected = false;

    // log
    this.error('onDisconnected', reason, new Error('unexpectedly disconnected'));
  }

  // cleanup state if reconnecting
  async onConnected (address, port) {
    // cleanup state
    this.state.time.connected = Date.now();
    this.state.connected = true;

    // log
    this.log('onConnected', 'connected', { address, port });
  }

  async connect () {
    // dont connect twice
    if (this.state.connected) {
      this.log('connect', 'connection not started: already connected');
      return;
    }

    // connect
    let server, port;
    try {
      ([server, port] = await this.client.connect());
    } catch (err) {
      this.error('connect', 'connection not started: failed to connect', err);
      return;
    }

    // update state
    this.state.time.connected = Date.now();
    this.state.connected = true;

    // register listeners
    await this.listen();

    this.log('connect', 'connection started', { server, port });
    return { server, port };
  }

  async disconnect () {
    // already disconnected
    if (!this.state.connected) {
      this.log('disconnect', 'connection not terminated: already disconnected');
      return;
    }

    // unregister handlers
    await this.dontlisten();

    // disconnect
    let server, port;
    try {
      ([server, port] = await this.client.disconnect());
    } catch (err) {
      this.error('disconnect', 'connection not terminated: failed to disconnect', err);
      return;
    }

    // update state
    this.state.time.disconnected = Date.now();
    this.state.connected = false;

    this.log('disconnect', 'connection terminated', { server, port });
    return { server, port };
  }

  async listen () {
    // dont listen twice
    if (this.state.listening) {
      this.log('listen', 'listen not started: already listening');
      return;
    }

    // make sure bound correctly
    this._onDisconnected = this.onDisconnected.bind(this);
    this._onMessage = this.onMessage.bind(this);
    this._onConnected = this.onConnected.bind(this);

    // listeners
    this.client.on('disconnected', this._onDisconnected);
    this.client.on('message', this._onMessage);
    this.client.on('connected', this._onConnected);

    // update state
    this.state.listening = true;
    this.state.time.listen = Date.now();

    this.log('listen', 'listen started');
    return this;
  }

  async dontlisten () {
    // already not listening
    if (!this.state.listening) {
      this.log('dontlisten', 'listen not stopped: not listening');
      return;
    }

    // remove listeners
    this.client.removeListener('disconnected', this._onDisconnected);
    this.client.removeListener('message', this._onMessage);
    this.client.removeListener('connected', this._onConnected);

    // update state
    this.state.listening = false;
    this.state.time.dontlisten = Date.now();

    this.log('dontlisten', 'listen stopped');
    return this;
  }

  async say (channel, message) {
    // if not connected, cant speak
    if (!this.state.connected) {
      this.log('say', 'message not sent: client not connected', { channel, message });
      return;
    }

    // if channel not in list, cant speak
    if (this.channels.indexOf(channel) < 0) {
      this.log('say', 'message not sent: not connected to channel', { channel, message });
      return;
    }

    // send message
    let sayInfo;
    try {
      sayInfo = await this.client.say(channel, message);
    } catch (err) {
      this.error('say', 'message not sent: failed to send', err, { channel, message });
      return;
    }

    // update state
    this.state.time.messageSent = Date.now();
    this.state.messagesSent++;

    this.log('say', 'message sent to channel', { channel, message });
    return sayInfo;
  }

  log (action, msg, other) {
    // update state
    this.state.time.log = Date.now();
    this.state.logs++;

    this._log(action, msg, other);
  }

  error (action, msg, err, other) {
    // update state
    this.state.time.error = Date.now();
    this.state.errors++;

    this._error(action, msg, err, other);
  }
}

module.exports = TwitchBot;
