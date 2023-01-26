process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});

require('jest-fetch-mock').enableMocks();
