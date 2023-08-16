class Console {
  static log(...args) {
    process.send({ log: [ 'log', ...args ] });
  }

  static debug(...args) {
    process.send({ log: [ 'debug', ...args ] });
  }

  static info(...args) {
    process.send({ log: [ 'info', ...args ] });
  }

  static warn(...args) {
    process.send({ log: [ 'warn', ...args ] });
  }

  static error(...args) {
    process.send({ log: [ 'error', ...args ] });
  }
}

module.exports = Console;
