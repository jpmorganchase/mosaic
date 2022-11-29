require('@testing-library/jest-dom/extend-expect');
const { configure } = require('@testing-library/react');
require('regenerator-runtime/runtime');

configure({ testIdAttribute: 'data-mosaic-testid' });

window.URL.createObjectURL = jest.fn().mockReturnValue('blob');
window.URL.revokeObjectURL = jest.fn();
window.ResizeObserver = require('resize-observer-polyfill');

window.scroll = jest.fn();

global.document.fonts = jest.fn();

// This is helpful to debug jest's unhandledRejection error
process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});
