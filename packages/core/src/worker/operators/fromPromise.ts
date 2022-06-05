import { concatMap, pipe } from 'rxjs';

export default function fromPromise<T, R>(callback: (page: T) => Promise<R>) {
  return pipe(concatMap<T, any>(callback));
}
