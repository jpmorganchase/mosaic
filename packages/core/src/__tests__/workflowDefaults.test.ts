import { expect, test, vi } from 'vitest';
import SourceManager from '../SourceManager';

// Minimal source lifecycle; the manager's real owner selection is under test.
vi.mock('../Source', () => ({
  default: class {
    id = Symbol();
    moduleDefinition;
    filesystem = { asReadOnly: () => ({}) };
    started = () => {};
    constructor(definition) {
      this.moduleDefinition = definition;
    }
    get prefixDir() {
      return this.moduleDefinition.options.prefixDir;
    }
    isOwner(path) {
      return Promise.resolve(path.startsWith(`/${this.prefixDir}/`));
    }
    hasWorkflow(name) {
      return this.moduleDefinition.workflows.some(workflow => workflow.name === name);
    }
    prepareWorkflow(name, path, input) {
      return this.moduleDefinition.workflows
        .find(workflow => workflow.name === name)
        .prepare({}, {}, path, input);
    }
    triggerWorkflow(send, name, path, input) {
      return this.moduleDefinition.workflows
        .find(workflow => workflow.name === name)
        .action(send, {}, {}, path, input);
    }
    onError() {}
    onUpdate() {}
    onExit() {}
    onStart(callback) {
      this.started = callback;
    }
    use() {}
    start() {
      this.started();
    }
  }
}));

test('two sources keep independent defaults and execution ownership for existing and new pages', async () => {
  const manager = new SourceManager({} as never, {} as never);
  const first = {
    name: 'save',
    options: {},
    prepare: vi.fn(() => ({ supportsCommitMessage: true, commitMessage: 'First source' })),
    action: vi.fn(async () => true)
  };
  const second = {
    name: 'save',
    options: {},
    prepare: vi.fn(() => ({ supportsCommitMessage: true, commitMessage: 'Second source' })),
    action: vi.fn(async () => true)
  };
  await manager.addSource(
    {
      modulePath: 'test',
      namespace: 'first',
      options: { prefixDir: 'first' },
      workflows: [first]
    } as never,
    {}
  );
  await manager.addSource(
    {
      modulePath: 'test',
      namespace: 'second',
      options: { prefixDir: 'second' },
      workflows: [second]
    } as never,
    {}
  );
  for (const [prefix, workflow, message] of [
    ['first', first, 'First source'],
    ['second', second, 'Second source']
  ] as const) {
    const path = `/${prefix}/page.mdx`;
    expect(await manager.prepareWorkflow('save', path, {})).toEqual({
      supportsCommitMessage: true,
      commitMessage: message
    });
    expect(await manager.triggerWorkflow(vi.fn(), 'save', path, {})).toBe(true);
    expect(workflow.action.mock.calls.at(-1)?.[3]).toBe(path);
    expect(
      await manager.prepareWorkflow('save', `/${prefix}/new.mdx`, { isNewPage: true })
    ).toEqual({ supportsCommitMessage: true, commitMessage: message });
    await manager.triggerWorkflow(vi.fn(), 'save', `/${prefix}/new.mdx`, {}, { newPage: true });
    expect(workflow.action.mock.calls.at(-1)?.[3]).toBe(`/${prefix}/new.mdx`);
    expect(workflow.prepare).toHaveBeenCalledTimes(2);
    expect(workflow.action).toHaveBeenCalledTimes(2);
  }
  await expect(manager.prepareWorkflow('save', '/missing/page.mdx', {})).rejects.toThrow(
    'not found'
  );
  await expect(
    manager.prepareWorkflow('save', '/missing/new.mdx', { isNewPage: true })
  ).rejects.toThrow('No source can create');
});
