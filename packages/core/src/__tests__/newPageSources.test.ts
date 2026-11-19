import { expect, test, vi } from 'vitest';
import SourceManager from '../SourceManager';

vi.mock('../Source', () => ({
  default: class {
    id = Symbol('source');
    filesystem = { asReadOnly: () => ({}) };
    namespace: string;
    prefixDir: string | undefined;
    config: { data: { sourceCapabilities: { writable?: boolean } } };
    workflows: string[];
    started = () => {};
    exited = () => {};
    constructor(definition, options) {
      this.namespace = definition.namespace;
      this.prefixDir = options.prefixDir;
      this.workflows = definition.workflows ?? [];
      this.config = { data: { sourceCapabilities: options.capabilities ?? {} } };
    }
    hasWorkflow(name) {
      return this.workflows.includes(name);
    }
    use() {}
    onUpdate() {}
    onError() {}
    onStart(callback) {
      this.started = callback;
    }
    onExit(callback) {
      this.exited = callback;
    }
    async start() {
      this.started();
    }
    stop() {
      this.exited();
    }
  }
}));

test('creation metadata follows live save candidates, namespace filtering and source removal', async () => {
  const manager = new SourceManager({} as never, {} as never);
  const add = (namespace, prefixDir, workflows, capabilities = {}) =>
    manager.addSource(
      {
        modulePath: 'fixture',
        namespace,
        workflows,
        options: { prefixDir, capabilities }
      } as never,
      {}
    );
  await add('shared', 'docs', [], { writable: false });
  const sdk = await add('shared', 'docs/sdk', ['save'], { writable: true });
  await add('other', '', ['save']);
  await add('other', undefined, ['save'], { writable: true });
  expect(manager.getNewPageSources()).toEqual([
    { prefixDir: 'docs/sdk', writable: true },
    { prefixDir: '', writable: false }
  ]);
  expect(manager.getNewPageSources(['shared'])).toEqual([
    { prefixDir: 'docs/sdk', writable: true }
  ]);
  sdk.stop();
  expect(manager.getNewPageSources(['shared'])).toEqual([]);
});
