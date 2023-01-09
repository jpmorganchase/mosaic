import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { useFooter } from '../useFooter';
import { SiteState } from '../store';

const footer: SiteState['sharedConfig']['footer'] = {
  description: 'Sign up to stay on top of new developments and solutions.',
  title: 'Subscribe to our Newsletter',
  href: 'http://a.link.com',
  label: 'Sign Up',
  helpLinks: {
    stackoverflowLabel: 'View our Stack Overflow',
    stackoverflowUrl: 'https://stack.com',
    symphonyLabel: 'Chat on Symphony',
    symphonyUrl: 'symphony://a_stream'
  }
};

const invalidMenuHeader: SiteState['sharedConfig']['header'] = {
  homeLink: '/developer',
  logo: '/some/url',
  title: 'Digital Platform Developer',
  menu: [
    {
      title: 'Products',
      // @ts-ignore
      href: '/developer/products'
    }
  ]
};

const state: Partial<SiteState> = {
  sharedConfig: { footer }
};

describe('GIVEN the `useFooter` hook', () => {
  describe('WHEN there are no footer props in the store', () => {
    test('THEN the hook returns undefined', () => {
      const { result } = renderHook(() => useFooter(), {
        wrapper: createWrapper()
      });
      expect(result.current).toBeUndefined();
    });
  });

  describe('WHEN there are footer props in the store', () => {
    test('THEN the footer props are returned', () => {
      const { result } = renderHook(() => useFooter(), {
        wrapper: createWrapper({ ...state })
      });
      expect(result.current?.description).toEqual(footer.description);
      expect(result.current?.title).toEqual(footer.title);
      expect(result.current?.href).toEqual(footer.href);
      expect(result.current?.label).toEqual(footer.label);
      expect(result.current?.helpLinks.stackoverflowLabel).toEqual(
        footer.helpLinks.stackoverflowLabel
      );
      expect(result.current?.helpLinks.stackoverflowUrl).toEqual(footer.helpLinks.stackoverflowUrl);
      expect(result.current?.helpLinks.symphonyLabel).toEqual(footer.helpLinks.symphonyLabel);
      expect(result.current?.helpLinks.symphonyUrl).toEqual(footer.helpLinks.symphonyUrl);
    });
  });
});
