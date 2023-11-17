import EventEmitter from 'events';
import type { Subscription } from 'rxjs';

import from from './operators/ObservableWorker.js';

export enum EVENT {
  ERROR = 'ERROR',
  EXIT = 'EXIT',
  START = 'START',
  UPDATE = 'UPDATE',
  TRACK = 'TRACK'
}

const textDecoder = new TextDecoder('utf8');

export default class WorkerSubscription {
  #worker$: Subscription;
  #emitter = new EventEmitter();

  constructor(workerData) {
    this.#worker$ = from<{ type: 'message' | 'init'; data: Uint8Array }>(workerData).subscribe({
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

  #onNext = ({ type, data }: { data: Uint8Array; type: 'init' | 'message' | 'track' }) => {
    if (type === 'message') {
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

  #onError = e => {
    this.#emitter.emit(EVENT.ERROR, e);
    this.#onComplete();
  };

  #onComplete = () => {
    this.#emitter.emit(EVENT.EXIT);
    this.#emitter.removeAllListeners();
  };
}
