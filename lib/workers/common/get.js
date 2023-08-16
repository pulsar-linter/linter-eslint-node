// [2023-08-1] I considered using 'lodash.get', but I figured we did
// not need a 931 LOC, 23.4 kB import for something this simple.
// https://www.npmjs.com/package/lodash.get?activeTab=code#index.js

function get(object, path, fallback) {
  if (typeof path === 'string') {
    path = path.split('.');
  }

  if (Array.isArray(path) === false) {
    throw new Error('Invalid path');
  }

  if (path.length === 0) {
    return object;
  }

  const currentKey = path[0];
  if (
    object == null ||
    typeof object !== 'object' ||
    ({}).hasOwnProperty.call(object, currentKey) === false
  ) {
    return fallback;
  }

  // This could break due to large callstacks
  // This is one of the trade offs we make for not using lodash
  // That being said, max call stack expected here is currently 2
  return get(object[currentKey], path.slice(1), fallback);
}

module.exports = { get };
