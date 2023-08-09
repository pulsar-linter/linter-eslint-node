const { AsyncLocalStorage } = require('async_hooks');
function safeStringify(data) {
  try {
    const seen = new WeakSet();

    return JSON.stringify(data, (_, value) => {
      if (typeof value !== "object" || value === null) {
        return value;
      }

      if (seen.has(value)) {
        return '[Circular]';
      }

      seen.add(value);

      if (value instanceof Error) {
        value.error = value.message;

        return Object.fromEntries(
          Object
            .getOwnPropertyNames(value)
            .map(key => [ key, value[key] ])
        );
      }
      return value;
    });
  } catch (error) {
    return JSON.stringify({
      message: error.message,
      stack: error.stack,
    });
  }
}

function stringify(input) {
  if (typeof input === 'string') {
    const start = input[0];
    const end = input[input.length - 1];

    if (
      (start === '[' && end === ']') ||
      (start === '{' && end === '}') ||
      (start === '"' && end === '"')
    ) {
      return input;
    }
  }

  return safeStringify(input);
}

/**
 * @typedef {Object} Store
 * @property {string} [key]
 * @property {string} [type]
 * @property {string} [filePath]
 * @property {string} [projectPath]
 */
/** @type {AsyncLocalStorage<Store|void>} */
const store = new AsyncLocalStorage();

function runWith (data, handler) {
  if (data == null) {
    return;
  }

  store.run(
    {
      key: data.key,
      type: data.type,
      filePath: data.filePath,
      projectPath: data.projectPath,
    },
    handler,
  );
}

function mergeWithStore (data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const state = store.getStore();

  if (state == null) {
    return data;
  }

  for (const [ key, value ] of Object.entries(state)) {
    if (
      // This is not supported in node 12
      // Object.hasOwn(data, key)
      ({}).hasOwnProperty.call(data, key) ||
      data[key] != null
    ) {
      continue;
    }

    data[key] = value;
  }

  return data;
}

/**
 * Write {input} to stdout in JSON form
 * @param {any} input The object to write to stdout
 */
function emit (input) {
  process.stdout.write(`${stringify(input)}\n`);
}

/**
 * Write {input} to stdout in JSON form
 * @param {any} input The object to write to stdout
 */
function emitMessage (input) {
  try {
    emit(mergeWithStore(input));
  } catch (error) {
    log(error.message);
  }
}

/**
 * Write {error} to stderr in JSON form
 * @param {any} error The object or error to write to stderr
 */
function emitError (error) {
  const merged = mergeWithStore(error);

  process.stderr.write(`${stringify(merged)}\n`);
}

/**
 * Write the following to stdout '{ log }' to stdout
 * @param {string} log The log message
 */
function log (log) {
  process.stdout.write(`${stringify({ log })}\n`);
}

module.exports = {
  emit,
  emitMessage,
  emitError,
  log,
  runWith,
};
