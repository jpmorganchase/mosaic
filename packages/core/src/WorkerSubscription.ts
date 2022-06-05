import { EventEmitter } from 'stream';
import type { Subscription } from 'rxjs';

import * as ObservableWorker from './operators/ObservableWorker';

export enum EVENT {
  ERROR = 'ERROR',
  EXIT = 'EXIT',
  START = 'START',
  UPDATE = 'UPDATE'
}

export default class WorkerSubscription {
  #worker$: Subscription;
  #emitter = new EventEmitter();

  constructor(workerData) {
    this.#worker$ = ObservableWorker.from<{ type: 'message' | 'signal'; data: {} }>(
      workerData
    ).subscribe({ next: this.#onNext, error: this.#onError, complete: this.#onComplete });
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

  #onNext = ({ type, data }) => {
    if (type === 'message') {
      this.#emitter.emit(EVENT.UPDATE, { data });
    } else if (type === 'init') {
      this.#emitter.emit(EVENT.START);
      if (data) {
        this.#emitter.emit(EVENT.UPDATE, { data });
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
