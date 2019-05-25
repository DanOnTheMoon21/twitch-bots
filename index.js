'use strict';

process.on('unhandledRejection', err => {
  console.error(err);
  process.exit(1);
});

const Manager = require('./src/manager');
const manager = new Manager();

