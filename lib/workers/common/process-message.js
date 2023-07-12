class JobKeyError extends Error {
  constructor () {
    super('Message had no job key');
    this.name = 'JobKeyError';
    this.type = 'no-job-key';
  }
}

class JobTypeError extends Error {
  constructor () {
    super('Message had no job type');
    this.name = 'JobTypeError';
    this.type = 'no-job-type';
  }
}

class JobNotFoundError extends Error {
  constructor (type) {
    super(`Could not find job of type: ${type}`);
    this.name = 'JobNotFoundError';
    this.type = 'no-job-found';
  }
}

/**
 * @param {Error} error
 * @returns {Object}
 */
function flatError(error) {
  const output = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };

  for (const key of Object.getOwnPropertyNames(error)) {
    output[key] = error[key];
  }

  return output;
}

/**
 * @typedef {import('../common/types.js').Job} Job
 */
/**
 * @param {{ [jobType: string]: (job: Job) => Promise<unknown>}} messageTypes
 */
function processMessage(messageTypes) {
  /**
   * @param {import('../common/types.js').Job} message
   * @returns {Promise<void>}
   */
  return async message => {
    const startTime = Date.now();
    try {
      if (!message && typeof message.key !== 'string') {
        throw new JobKeyError();
      }

      if (typeof message.type !== 'string') {
        throw new JobTypeError();
      }

      if (
        ({}).hasOwnProperty.call(messageTypes, message.type) &&
        typeof messageTypes[message.type] === 'function'
      ) {
        return void process.send({
          key: message.key,
          resolve: await messageTypes[message.type](message),
          duration: Date.now() - startTime
        });
      }

      throw new JobNotFoundError(message.type);
    } catch (error) {
      process.send({
        key: message.key,
        reject: flatError(error),
        duration: Date.now() - startTime
      });
    }
  };
}

module.exports = { processMessage };
