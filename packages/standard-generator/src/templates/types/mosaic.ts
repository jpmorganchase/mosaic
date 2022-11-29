import type {
  MosaicAppProps,
  MiddlewarePresetsProps
} from '@dpmosaic/site-components/dist/utils/middlewarePresets';

/**
 * In this file, define each of your own Middleware props, which combine together into MyAppProps
 *
 * Define the props returned by your middleware
 *
 * export interface ExampleMiddlewareProps {
 *   someProp?: string;
 * }
 *
 * Insert the options you want to pass to your middleware (optional)
 *
 * export interface ExampleMiddlewareOptions {
 *   someOption: number;
 * }
 *
 * Then compose all your own Middleware props with the default MosaicAppProps
 *
 * export interface MyAppProps extends MosaicAppProps<MyMiddlewareProps> {};
 */

export declare type MyMiddlewareProps = MiddlewarePresetsProps /* & ExampleMiddlewareOptions */;

export interface MyAppProps extends MosaicAppProps<MyMiddlewareProps> {}
