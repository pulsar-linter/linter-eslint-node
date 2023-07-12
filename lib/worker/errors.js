class IncompatibleVersionError extends Error {
  constructor (version, minimumVersion) {
    // eslint-disable-next-line max-len
    super(`This project uses ESLint version ${version}; linter-eslint-node requires a minimum of ${minimumVersion}.`,);
    this.name = 'IncompatibleVersionError';
    this.type = 'incompatible-version';
    this.version = version;
  }
}

class JobKeyError extends Error {
  constructor () {
    super('Message had no job key',);
    this.name = 'JobKeyError';
    this.type = 'no-job-key';
  }
}

class JobTypeError extends Error {
  constructor () {
    super('Message had no job type',);
    this.name = 'JobTypeError';
    this.type = 'no-job-type';
  }
}

class JobNotFoundError extends Error {
  constructor (type,) {
    super(`Could not find job of type: ${type}`,);
    this.name = 'JobNotFoundError';
    this.type = 'no-job-found';
  }
}

class ConfigNotFoundError extends Error {
  constructor (message, filePath, projectPath,) {
    super(message,);
    this.name = 'ConfigNotFoundError';
    this.type = 'config-not-found';
    this.filePath = filePath;
    this.projectPath = projectPath;
  }
}

class UnknownError extends Error {
  constructor () {
    super('Unknown error',);
    this.name = 'UnknownError';
    this.type = 'unknown';
  }
}

module.exports = {
  IncompatibleVersionError,
  JobKeyError,
  JobTypeError,
  JobNotFoundError,
  ConfigNotFoundError,
  UnknownError,
};
