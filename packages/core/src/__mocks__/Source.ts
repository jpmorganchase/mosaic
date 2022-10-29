const constructorSpy = jest.fn();

class Source {
  constructor(...args) {
    constructorSpy(...args);
    this.filesystem = {
      asReadOnly: jest.fn(),
      clearCache: jest.fn(),
      freeze: jest.fn(),
      fromJSON: jest.fn(),
      reset: jest.fn(),
      symlinksFromJSON: () =>
        new Promise(resolve => {
          setTimeout(resolve);
        })
    };
    this.id = Symbol(args[0].name || 'some description');
  }
}

Source.prototype.onError = jest.fn();
Source.prototype.onExit = jest.fn();
Source.prototype.onStart = jest.fn();
Source.prototype.onUpdate = jest.fn();
Source.prototype.invokeAfterUpdate = () =>
  new Promise(resolve => {
    setTimeout(resolve);
  });
Source.prototype.requestCacheClear = jest.fn();
Source.prototype.start = jest.fn();
Source.prototype.stop = jest.fn();
Source.prototype.use = jest.fn();
Source.prototype.constructorSpy = constructorSpy;

export default Source;
