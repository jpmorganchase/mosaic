// This is helpful to debug jest's unhandledRejection error
process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});
