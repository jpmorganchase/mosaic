import LiveCodeClient, {
  type LiveCodeProps as LiveCodeClientProps
} from '@jpmorganchase/mosaic-live-code';

interface LiveCodeProps extends LiveCodeClientProps {}

export async function LiveCode({ scope = {}, ...restProps }: LiveCodeProps) {
  let finalScope = { ...(await import('@jpmorganchase/mosaic-components')), ...scope };

  return <LiveCodeClient {...restProps} scope={finalScope} />;
}
