'use babel';

export default class Console {
  static get enabled() {
    if (process.env.SILENCE_LOG) {
      return false;
    }

    return atom.config.get('linter-eslint-node.advanced.enableLogging');
  }

  static log(...args) {
    if (this.enabled) {
      window.console.log('[linter-eslint-node]', ...args);
    }
  }

  static debug(...args) {
    if (this.enabled) {
      window.console.debug('[linter-eslint-node]', ...args);
    }
  }

  static info(...args) {
    if (this.enabled) {
      window.console.info('[linter-eslint-node]', ...args);
    }
  }

  static warn(...args) {
    if (this.enabled) {
      window.console.warn('[linter-eslint-node]', ...args);
    }
  }

  static error(...args) {
    if (this.enabled) {
      window.console.error('[linter-eslint-node]', ...args);
    }
  }
}
