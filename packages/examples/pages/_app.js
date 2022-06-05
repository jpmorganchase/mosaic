import '../styles/globals.css';

import '../../../../digital-platform-docs/packages/theme/dist/index.css';
import '../../../../digital-platform-docs/packages/theme/dist/baseline.css.css';
import '../../../../digital-platform-docs/packages/site-components/index.css';
import '../../../../digital-platform-docs/packages/components-next/index.css';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
