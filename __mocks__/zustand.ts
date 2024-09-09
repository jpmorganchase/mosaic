import { vi, afterEach } from 'vitest';

const actualZustand = await vi.importActual<typeof import('zustand')>('zustand');

const actualCreate = actualZustand.create;

const stores = new Set<() => unknown>();

const create = ((createState: any) => {
  const store = actualCreate(createState);
  const initialState = store.getState();
  stores.add(() => store.setState(initialState, true));

  return store;
}) as typeof actualCreate;

afterEach(() => {
  stores.forEach(resetFn => resetFn());
});

const { createStore, useStore } = actualZustand;

export { create, createStore, useStore };
