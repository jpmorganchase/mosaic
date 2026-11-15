export default {
  Custom() {
    if (process.env.MOSAIC_CONSUMER_FAIL === 'markdown')
      throw new Error('Deliberate Markdown converter failure');
    return 'Converted component';
  }
};
