import EventEmitter from 'events';
import { Subject, type Subscription } from 'rxjs';

import from from './operators/ObservableWorker.js';

export enum EVENT {
  ERROR = 'ERROR',
  EXIT = 'EXIT',
  START = 'START',
  UPDATE = 'UPDATE',
  TRACK = 'TRACK'
}

const textDecoder = new TextDecoder('utf8');

type RefreshReply = { id: number; refreshed?: boolean; error?: string };

type WorkerMessage =
  | { data: Uint8Array; type: 'init' | 'message' | 'track' }
  | { data: RefreshReply; type: 'refresh' };

export default class WorkerSubscription {
  #worker$: Subscription;
  #emitter = new EventEmitter();
  #toWorker$ = new Subject<{ type: 'refresh'; id: number }>();
  #pendingRefreshes = new Map<
    number,
    { resolve: (refreshed: boolean) => void; reject: (error: Error) => void }
  >();
  #lastRefreshId = 0;

  constructor(workerData) {
    this.#worker$ = from<WorkerMessage>(workerData, this.#toWorker$).subscribe({
      next: this.#onNext,
      error: this.#onError,
      complete: this.#onComplete
    });
  }

  get closed() {
    return this.#worker$?.closed;
  }

  stop() {
    if (this.closed) {
      throw new Error('Cannot stop source - subscription is already closed');
    }
    this.#worker$.unsubscribe();
    this.#onComplete();
  }

  /**
   * Asks the worker's source to check for changes now. Resolves to `false`
   * when the source has no `refresh` hook, and rejects if the check fails or
   * the worker stops first.
   */
  refresh(): Promise<boolean> {
    if (this.closed) {
      return Promise.reject(new Error('Cannot refresh source - subscription is closed'));
    }
    const id = ++this.#lastRefreshId;
    return new Promise((resolve, reject) => {
      this.#pendingRefreshes.set(id, { resolve, reject });
      this.#toWorker$.next({ type: 'refresh', id });
    });
  }

  once(type: EVENT, handler) {
    const autoUnsubscribeHandler = (...args) => {
      this.#emitter.off(type, autoUnsubscribeHandler);
      handler(...args);
    };
    this.on(type, autoUnsubscribeHandler);

    return () => this.#emitter.off(type, autoUnsubscribeHandler);
  }

  on(type: EVENT, handler) {
    this.#emitter.on(type, handler);

    return () => this.#emitter.off(type, handler);
  }

  #onNext = ({ type, data }: WorkerMessage) => {
    if (type === 'refresh') {
      this.#settleRefresh(data);
    } else if (type === 'message') {
      this.#emitter.emit(EVENT.UPDATE, { data: JSON.parse(textDecoder.decode(data)) });
    } else if (type === 'track') {
      this.#emitter.emit(EVENT.TRACK, { data: JSON.parse(textDecoder.decode(data)) });
    } else if (type === 'init') {
      if (data) {
        // We receive a file buffer (cached fs) for 'init', not an object
        this.#emitter.emit(EVENT.START, { data: JSON.parse(textDecoder.decode(data)) });
      } else {
        // started with no cached fs
        this.#emitter.emit(EVENT.START);
      }
    } else {
      this.#onError(
        new Error(`Unsupported type '${type}' with value of '${data}' received from source worker.`)
      );
      this.#worker$.unsubscribe();
      this.#worker$ = null;
    }
  };

  #settleRefresh({ id, refreshed, error }: RefreshReply) {
    const pending = this.#pendingRefreshes.get(id);
    if (!pending) return;
    this.#pendingRefreshes.delete(id);
    if (error !== undefined) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(refreshed === true);
    }
  }

  #onError = e => {
    this.#emitter.emit(EVENT.ERROR, e);
    this.#onComplete();
  };

  #onComplete = () => {
    this.#pendingRefreshes.forEach(({ reject }) =>
      reject(new Error('Source stopped before it was refreshed'))
    );
    this.#pendingRefreshes.clear();
    this.#emitter.emit(EVENT.EXIT);
    this.#emitter.removeAllListeners();
  };
}
