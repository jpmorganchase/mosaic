import { Observable } from 'rxjs';
import type Repo from './Repo.js';
import { type DiffResult } from './Repo.js';

export default function fromFsWatch(repo: Repo) {
  return new Observable<DiffResult | null>(subscriber => {
    const removeListener = repo.onCommitChange(
      () => () => subscriber.next(null),
      (error: any) => subscriber.error(error)
    );
    return function unsubscribe() {
      removeListener();
    };
  });
}
