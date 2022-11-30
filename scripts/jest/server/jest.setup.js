process.on('unhandledRejection', reason => {
  console.error('REJECTION', reason);
});
