import { AppHeader } from '@jpmorganchase/mosaic-site-components';
import { useAppHeader } from '@jpmorganchase/mosaic-store';

function TestComponent() {
  const props = useAppHeader();
  console.log('>>>>>> app header props', props);
  return <AppHeader />;
}

export default TestComponent;
