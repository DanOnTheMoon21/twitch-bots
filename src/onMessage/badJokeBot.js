'use strict';

const wreck = require('@hapi/wreck');

async function getJoke () {
  const resp = await wreck.get('https://icanhazdadjoke.com', {
    headers: {
      Accept: 'application/json'
    },
    timeout: 10000,
    json: 'force'
  });
  const { status, joke } = resp.payload;

  if (status !== 200) {
    throw new Error(`Error getting joke: status ${status}`);
  }

  return joke;
}

async function onMessage (channel, userstate, message) {
  const messageType = userstate['message-type'];

  // not chat, do nothing
  if (messageType !== 'chat') {
    return;
  }

  // if contains kw joke
  if (message.indexOf('joke') > -1) {
    let joke;
    try {
      joke = await getJoke();
    } catch (err) {
      this.error('onMessage', 'error getting joke', err, { channel, userstate, message });
      return;
    }

    return this.say(channel, joke);
  }
}

module.exports = onMessage;
