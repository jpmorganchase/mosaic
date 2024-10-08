export type SourceWorkflowAction<TSourceOptions, TOptions> = (
  sendWorkflowProgressMessage: SendSourceWorkflowMessage,
  sourceOptions: TSourceOptions,
  workflowOptions: TOptions,
  ...args: any[]
) => Promise<unknown>;

export type SourceWorkflow<TSourceOptions = unknown, TOptions = Record<string, unknown>> = {
  name: string;
  options?: TOptions;
  action: SourceWorkflowAction<TSourceOptions, TOptions>;
};

export type SourceWorkflowMessageStatus = 'SUCCESS' | 'ERROR' | 'IN_PROGRESS' | 'COMPLETE';

export type SendSourceWorkflowMessage = (message: any, status: SourceWorkflowMessageStatus) => void;

export type SourceWorkflowMessageEvent = {
  status: SourceWorkflowMessageStatus;
  message: any;
  channel?: string;
};
