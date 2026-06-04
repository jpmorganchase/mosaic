import { Observable } from 'rxjs';
import type Repo from './Repo.js';
import { type DiffResult } from './Repo.js';

/**
 * Wraps `repo.onCommitChange` as an RxJS source. Emits one value per
 * poll-interval tick where the upstream `updatedFilesGenerator` decides
 * a re-scan is warranted — i.e. either a new HEAD with changed files,
 * or a new HEAD on the `disableAutoPullChanges` path. Never completes
 * on its own; callers tear it down by unsubscribing.
 *
 * Historical note: this used to pass `() => () => subscriber.next(null)`
 * to `onCommitChange`. That was a function returning a function — the
 * inner call to `subscriber.next` was never reached, so the observable
 * never emitted. The interval timer inside `Repo.onCommitChange` ran
 * forever, allocating buffered `git fetch` output per tick.
 */
export default function fromCommitChange(
  repo: Repo,
  disableAutoPullChanges: boolean,
  checkIntervalMins: number
) {
  return new Observable<DiffResult | null>(subscriber => {
    const removeListener = repo.onCommitChange(
      files => subscriber.next(files),
      (error: unknown) => subscriber.error(error),
      disableAutoPullChanges,
      checkIntervalMins * 60 * 1000
    );
    return function unsubscribe() {
      removeListener();
    };
  });
}
