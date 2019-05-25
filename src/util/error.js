'use strict';

const { appendFileSync } = require('fs');

function error (action, msg, err, other = {}) {
  const string = JSON.stringify({
    action,
    msg,
    isError: true,
    err: {
      ...err
    },
    ...other,
    time: Date.now()
  });

  // print error
  if (this.logFile) {
    appendFileSync(this.logFile, `${string}\n`);
  } else {
    console.log(string);
  }
}

module.exports = error;
