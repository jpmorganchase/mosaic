export default {
  async afterUpdate() {
    if (process.env.MOSAIC_CONSUMER_FAIL === 'main')
      throw new Error('Deliberate main-thread plugin failure');
  }
};
