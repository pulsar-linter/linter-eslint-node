'use babel';

import { fork } from 'child_process';
import * as path from 'path';
import console from './console';

/** @type {Map<string, import('node:child_process').ChildProcess>} */
const Workers = new Map();
const WorkersPrivate = new WeakMap();

/**
 * @typedef {Map<string, {
 *   message: { type: string, [key: string]: unknown },
 *   resolve: (value: unknown) => void,
 *   reject: (error: Error) => void
 * }>} MessageMap
 */
/** @type {WeakMap<import('node:child_process').ChildProcess, MessageMap>} */
const Messages = new WeakMap();

/**
 * @param {import('./prerequisites').PrerequisiteInfo} prerequisites
 * @returns {string}
 */
function getBestWorkerPath(prerequisites) {
  const [ eslintMajorVersion ] = prerequisites.eslintVersion.split('.');

  if (eslintMajorVersion === '8') {
    if (prerequisites.eslintConfig.endsWith('eslint.config.js')) {
      return path.resolve(__dirname, 'workers/8-flat/main.js');
    }

    return path.resolve(__dirname, 'workers/8/main.js');
  }
}

/**
 * Find or Create a node worker process.
 * This process is cached
 * This is because we have different workers depending on the eslint version.
 * The state of the node processes will be tracked, in order to return a useful worker.
 *
 * @param {string} projectPath The path of the project in pulsar
 * @param {import('./prerequisites').PrerequisiteInfo} prerequisites
 * @returns {Promise<import('node:child_process').ChildProcess>}
 */
export async function ensureWorker(projectPath, prerequisites) {
  const { nodePath } = prerequisites;
  const workerKey = [
    projectPath,
    prerequisites.nodePath,
    prerequisites.nodeVersion
  ].join(':');

  console.debug(`Getting worker for ${nodePath}`);
  if (Workers.has(workerKey) === false) {
    Workers.set(workerKey, (() => {
      console.debug(`Spawning ${nodePath}`);

      const worker = fork(
        getBestWorkerPath(prerequisites),
        { execPath: nodePath }
      );
      WorkersPrivate.set(worker, { projectPath, ...prerequisites });

      Messages.set(worker, new Map());
      worker.on('message', (message) => {
        if (Array.isArray(message.log)) {
          const [ level, ...parts ] = message.log;
          console[level](...parts);
          return;
        }

        const messages = Messages.get(worker);
        if (messages.has(message.key) === false) {
          return console.error(`[${message.key}] Handlers not found`);
        }

        const request = messages.get(message.key);
        console.debug(
          `[${message.key}] ${request.message.type} took ${message.duration} ms`,
          request.message.content?.filePath
        );

        if (message.reject != null) {
          return request.reject(message.reject);
        }

        if (message.resolve != null) {
          return request.resolve(message.resolve);
        }
      });

      function cleanMessages(worker) {
        const messages = Messages.get(worker);
        if (messages != null) {
          console.info('Message cleanup', { worker, messages });
          // We resolve with null in order to leave the previous lint result
          // This can be quickly re-run later
          messages.forEach(({ resolve }) => resolve(null));
        }
      }

      let logged = false;
      worker.on('error', console.error);
      worker.on('exit', () => {
        if (logged) return;
        logged = true;

        console.warn('Worker exited', workerKey);
        cleanMessages(worker);
        Workers.delete(workerKey);
      });
      worker.on('close', () => {
        if (logged) return;
        logged = true;

        console.warn('Worker closed', workerKey);
        cleanMessages(worker);
        Workers.delete(workerKey);
      });

      return worker;
    })());
  }

  return Workers.get(workerKey);
}

/**
 * Remove all workers associated with {projectPath}
 *
 * @param {string} projectPath The path of the project in pulsar
 * @returns {Promise<void>}
 */
export async function removeProject(projectPath) {
  console.info('Removing Project', projectPath);
  const removed = new Set();

  for (const worker of Workers.values()) {
    const workerDetails = WorkersPrivate.get(worker);

    if (workerDetails.projectPath === projectPath) {
      console.info('Removing', workerDetails);
      worker.kill();
      removed.add(worker);
    }
  }

  return removed;
}

export async function disposeAll() {
  for (const worker of Workers.values()) {
    worker.kill();
  }
}

/**
 * This will manage the receipt of messages sent including message timeouts.
 * This is managed in abstract to avoid too many listeners on the worker event bus.
 *
 * @param {import('node:child_process').ChildProcess} worker
 * @param {{ type: string, [key: string]: unknown }} message
 * @param {Number} [timeoutDuration=15000]
 * @returns {Promise<unknown>}
 */
export async function sendMessage(worker, message, timeoutDuration = 15000) {
  if (
    // if child process is still running `exitCode` will be `null`
    worker?.exitCode != null ||
    // whether it is still possible to send and receive messages
    worker?.connected !== true ||
    // whether the child process successfully received a signal
    worker?.killed === true
  ) {
    throw new Error('Worker is unable to recieve the linting request');
  }

  const key = Math.random().toString(36).slice(2, 10);
  const messages = Messages.get(worker);
  return new Promise((resolve, reject) => {
    messages.set(key, {
      message,
      resolve(result) {
        messages.delete(key);
        clearTimeout(timeout);
        resolve(result);
      },
      reject(error) {
        messages.delete(key);
        clearTimeout(timeout);
        reject(error);
      }
    });

    const timeout = setTimeout(
      ({ reject }) => {
        // there was a timeout, so we kill the worker process
        worker.kill();
        reject(new Error('Request timed out'));
      },
      timeoutDuration,
      messages.get(key)
    );

    worker.send({ ...message, key });
  });
}
