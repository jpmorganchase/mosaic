export default function createPublicationQueue() {
  let pending: Promise<unknown> = Promise.resolve();

  return <T>(publish: () => T | Promise<T>): Promise<T> => {
    const result = pending.then(publish);
    pending = result.catch(() => undefined);
    return result;
  };
}
