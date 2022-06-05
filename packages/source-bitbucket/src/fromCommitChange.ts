import { Observable } from 'rxjs';
import type Repo from './Repo';

export default function fromFsWatch(
  repo: Repo
) {
  return new Observable(subscriber => {
    const removeListener = repo.onCommitChange(() =>
      () => subscriber.next(null), error => subscriber.error(error));
    return function unsubscribe() {
      removeListener();
    };
  });
}
