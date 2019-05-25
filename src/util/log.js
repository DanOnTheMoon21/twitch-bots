'use strict';

const { appendFileSync } = require('fs');

function log (action, msg, other = {}) {
  const string = JSON.stringify({
    action,
    msg,
    ...other,
    time: Date.now()
  });

  // print message
  if (this.logFile) {
    appendFileSync(this.logFile, `${string}\n`);
  } else {
    console.log(string);
  }
}

module.exports = log;
