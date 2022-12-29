import type { GetServerSidePropsContext } from 'next';
import deepmerge from 'deepmerge';

import type { MosaicAppProps } from './middlewarePresets.js';
import MiddlewareError from './MiddlewareError.js';

const overwriteMerge = (_, sourceArray) => sourceArray;

/** Props returned after running Middleware */
export type MiddlewareResult<TProps> = Awaited<MosaicAppProps<TProps>>;

/** Options to be passed to Middleware */
export type MosaicMiddlewareOptions = Record<string, unknown>;

/** Middleware callbacks return props to be added to the page */
export type MosaicMiddleware<TProps = unknown, TOptions = MosaicMiddlewareOptions> = (
  /** Context provides information on the current page */
  context: GetServerSidePropsContext,
  /** Middleware specific options */
  options: TOptions,
  /** Previous result created by plugins */
  lastState: Record<string, unknown>
) => Promise<MiddlewareResult<TProps>>;

/** Middleware with a configuration object specifying options */
export type MosaicMiddlewareWithConfig<TProps, TConfig> = [
  MosaicMiddleware<TProps, TConfig>,
  TConfig
];

/** Function to run all provided middleware */
export type MosaicMiddlewareRunner<TProps> = (
  context: GetServerSidePropsContext,
  options: MosaicMiddlewareOptions
) => Promise<MiddlewareResult<TProps>>;

/**
 * Creates a middleware runner from the collection of provided middleware
 * @param initialState initial state
 * @param middleware a collection of middleware to be executed in order to get the page props
 * @returns a middleware runner
 */
export function createMiddlewareRunner<TProps>(
  initialState: Record<string, unknown>,
  middleware: Array<MosaicMiddleware<any> | MosaicMiddlewareWithConfig<any, any>>
): MosaicMiddlewareRunner<TProps> {
  return async function middlewareRunner(context, options) {
    let result: MiddlewareResult<TProps> = initialState;
    const errors: Error[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const fnOrConfig of middleware) {
      let fn: MosaicMiddleware<TProps, any>;
      let finalOptions = options;
      try {
        if (typeof fnOrConfig === 'function') {
          fn = fnOrConfig;
        } else {
          fn = fnOrConfig[0];
          finalOptions = { ...options, ...fnOrConfig[1] };
        }
        // eslint-disable-next-line no-await-in-loop
        const nextState = await fn(context, finalOptions, result);
        result = deepmerge<MiddlewareResult<TProps>>(result, nextState, {
          arrayMerge: overwriteMerge
        });
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error);
        } else {
          const unexpectedError = new MiddlewareError(500, undefined, [String(error)], {
            show500: true
          });
          errors.push(unexpectedError);
        }
      }
    }
    if (result.redirect) {
      return { redirect: result.redirect };
    }
    const show404 = errors.some(error => {
      if (error instanceof MiddlewareError) {
        return error.props?.show404;
      }
      return false;
    });
    const show500 =
      !show404 &&
      errors.some(error => {
        if (error instanceof MiddlewareError) {
          return error.props?.show500;
        }
        return true;
      });

    if (show500) {
      console.error('An un-expected error(s) was thrown which caused the 500 page to appear');
      errors.forEach(error => {
        console.error(error.message);
      });
    }

    if (show404 || show500) {
      context.res.setHeader(`X-Mosaic-${show404 ? '404' : '500'}`, 'true');
    }
    const props: TProps = { ...result.props, show404, show500 } as TProps;
    return { props };
  };
}
