import { vi } from 'vitest';
const constructorSpy = vi.fn();

class Source {
  constructor(...args) {
    constructorSpy(...args);
    this.filesystem = {
      asReadOnly: vi.fn(),
      clearCache: vi.fn(),
      freeze: vi.fn(),
      fromJSON: vi.fn(),
      reset: vi.fn(),
      symlinksFromJSON: () =>
        new Promise(resolve => {
          setTimeout(resolve);
        })
    };
    this.id = Symbol(args[0].name || 'some description');
    this.moduleDefinition = args[0];
  }
}

Source.prototype.onError = vi.fn();
Source.prototype.onExit = vi.fn();
Source.prototype.onStart = vi.fn();
Source.prototype.onUpdate = vi.fn();
Source.prototype.invokeAfterUpdate = () =>
  new Promise(resolve => {
    setTimeout(resolve);
  });
Source.prototype.requestCacheClear = vi.fn();
Source.prototype.start = vi.fn();
Source.prototype.stop = vi.fn();
Source.prototype.use = vi.fn();
Source.prototype.constructorSpy = constructorSpy;

export default Source;
