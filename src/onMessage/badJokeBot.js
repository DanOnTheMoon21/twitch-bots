'use strict';

async function onMessage (channel, userstate, message) {
  this.say(channel, message);
}

module.exports = onMessage;
