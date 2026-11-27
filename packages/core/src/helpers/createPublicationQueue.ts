export default function createPublicationQueue() {
  let pending = Promise.resolve();

  return (publish: () => Promise<void>) => {
    pending = pending.then(publish).catch(error => {
      console.error('[Mosaic][Core] Source publication failed', error);
    });
  };
}
