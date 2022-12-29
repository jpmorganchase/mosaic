import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import type { MosaicMiddleware } from './createMiddlewareRunner';
/**
 *  [[`MosaicModeProps`]] specifies the mode mosaic uses
 */
export interface MosaicModeProps {
  mode?: MosaicMode;
}

/**
 * Adds the [[`MosaicModeProps`]] object to the page props
 * @param context
 */
export const withMosaicMode: MosaicMiddleware<MosaicModeProps> = async context => {
  const mode: MosaicMode = (process.env.MOSAIC_MODE || 'active') as MosaicMode;
  const mosaicContentUrl = process.env[`MOSAIC_${mode.toUpperCase()}_MODE_URL`] || '';
  context.res.setHeader('X-Mosaic-Mode', mode);
  context.res.setHeader('X-Mosaic-Content-Url', mosaicContentUrl);
  return { props: { mode } };
};
