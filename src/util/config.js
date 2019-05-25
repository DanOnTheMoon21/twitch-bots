'use strict';

const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { safeLoad } = require('js-yaml');

function read () {
  const path = resolve(__dirname, '../../config.yml');

  if (!existsSync(path)) {
    throw new Error('config.yml does not exist.');
  }

  return safeLoad(readFileSync(path));
}

module.exports = read;
