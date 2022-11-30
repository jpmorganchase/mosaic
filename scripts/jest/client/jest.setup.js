global.Range = function Range() {};

const createContextualFragment = html => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.children[0];
};

Range.prototype.createContextualFragment = html => createContextualFragment(html);

// Based on similar script in React
// https://github.com/facebook/react/blob/fa7a97fc46935e1611d52da2fdb7d53f6ab9577d/scripts/jest/setupEnvironment.js
global.requestIdleCallback = function requestIdleCallback(callback) {
  return setTimeout(() => {
    callback({
      timeRemaining() {
        return Infinity;
      }
    });
  });
};

global.cancelIdleCallback = function cancelIdleCallback(callbackID) {
  clearTimeout(callbackID);
};

require('jest-fetch-mock').enableMocks();
