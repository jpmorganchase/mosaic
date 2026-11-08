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

/** Provider-independent data sent with a successful workflow's `COMPLETE` event. */
export interface SourceWorkflowCompletion {
  /** Browser URL of the pull request, when the workflow creates one. */
  pullRequestUrl?: string;
}

export type SendSourceWorkflowMessage = (message: any, status: SourceWorkflowMessageStatus) => void;

export type SourceWorkflowMessageEvent = {
  status: SourceWorkflowMessageStatus;
  message: any;
};
