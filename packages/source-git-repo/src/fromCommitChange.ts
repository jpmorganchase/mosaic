import { Observable } from 'rxjs';
import type Repo from './Repo.js';
import { type DiffResult } from './Repo.js';

export default function fromFsWatch(
  repo: Repo,
  disableAutoPullChanges: boolean,
  checkIntervalMins: number
) {
  return new Observable<DiffResult | null>(subscriber => {
    const removeListener = repo.onCommitChange(
      () => () => subscriber.next(null),
      (error: any) => subscriber.error(error),
      disableAutoPullChanges,
      checkIntervalMins * 60 * 1000
    );
    return function unsubscribe() {
      removeListener();
    };
  });
}
