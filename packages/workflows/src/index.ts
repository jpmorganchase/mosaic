import type { SourceWorkflow } from '@jpmorganchase/mosaic-types';
import BitbucketPullRequestWorkflow from './BitbucketPullRequestWorkflow.js';
import GitHubPullRequestWorkflow from './GitHubPullRequestWorkflow.js';

export { BitbucketPullRequestWorkflow, GitHubPullRequestWorkflow };

/**
 * Helper function to apply additional or overwrite existing workflow options
 * @param workflow the workflow to modify
 * @param options the new/updated options
 * @returns Workflow with options updated
 *
 * @example
 * import { GitHubPullRequestWorkflow, applyWorkflowOptions } from "@jpmorganchase/mosaic-workflows";
 *
 * applyWorkflowOptions( GitHubPullRequestWorkflow, {proxyEndpoint: 'http://your.proxy.com'})
 *
 */
export const applyWorkflowOptions = (
  workflow: SourceWorkflow,
  options: Record<string, unknown>
): SourceWorkflow => {
  const { options: workflowBaseOptions, ...restWorkflow } = workflow;

  return {
    ...restWorkflow,
    options: { ...workflowBaseOptions, ...options }
  };
};
