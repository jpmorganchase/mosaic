export type SourceWorkflowAction<TSourceOptions, TOptions> = (
  sourceOptions: TSourceOptions,
  workflowOptions: TOptions,
  ...args: any[]
) => Promise<unknown>;

export type SourceWorkflow<TSourceOptions = unknown, TOptions = unknown> = {
  name: string;
  options?: TOptions;
  action: SourceWorkflowAction<TSourceOptions, TOptions>;
};
