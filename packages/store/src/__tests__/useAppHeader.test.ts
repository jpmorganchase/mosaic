import { renderHook } from '@testing-library/react';

import { createWrapper } from './test-utils/utils';
import { useAppHeader } from '../useAppHeader';
import { SiteState } from '../store';

const header: SiteState['sharedConfig']['header'] = {
  homeLink: '/mosaic',
  logo: '/some/url',
  title: 'Digital Platform mosaic',
  menu: [
    {
      title: 'Products',
      link: '/mosaic/products'
    },
    {
      title: 'Case Studies',
      link: '/mosaic/case-studies'
    },
    {
      title: 'Docs & Tools',
      links: [
        {
          title: 'Docs',
          link: '/mosaic/docs'
        },
        {
          title: 'APIs',
          link: '/mosaic/apis'
        },
        {
          title: 'Start Your Project',
          link: '/apps/app-registry'
        }
      ]
    },
    {
      title: 'Community Updates',
      links: [
        {
          title: 'Newsletters',
          link: '/mosaic/newsletters'
        },
        {
          title: 'Blog',
          link: ' http://www.example.com/blog'
        },
        {
          title: 'Podcasts',
          link: '/mosaic/podcasts'
        },
        {
          title: 'Release Notes',
          link: '/mosaic/release-notes'
        },
        {
          title: 'Operating Model',
          link: ' http://www.example.com/release-notes'
        }
      ]
    },
    {
      title: 'Support',
      links: [
        {
          title: 'Contact',
          link: '/mosaic/support'
        },
        {
          title: 'Contributing',
          link: '/mosaic/support/contributing'
        },
        {
          title: 'Incidents & RCAs',
          link: '/mosaic/support/rcas'
        },
        {
          title: 'Runbooks',
          link: '/mosaic/support/runbooks'
        },
        {
          title: 'Site',
          link: '/mosaic/site'
        }
      ]
    }
  ]
};

const invalidMenuHeader: SiteState['sharedConfig']['header'] = {
  homeLink: '/mosaic',
  logo: '/some/url',
  title: 'Mosaic',
  menu: [
    {
      title: 'Products',
      // @ts-ignore
      href: '/mosaic/products'
    }
  ]
};

const state: Partial<SiteState> = {
  sharedConfig: { header }
};

const inValidMenuState: Partial<SiteState> = {
  sharedConfig: { header: invalidMenuHeader }
};

describe('GIVEN the `useAppHeader` hook', () => {
  describe('WHEN there are no header props in the store', () => {
    test('THEN the hook returns undefined', () => {
      const { result } = renderHook(() => useAppHeader(), {
        wrapper: createWrapper()
      });
      expect(result.current).toBeUndefined();
    });
  });

  describe('WHEN there are header props in the store', () => {
    test('THEN the hook returns a homelink, logo and a title', () => {
      const { result } = renderHook(() => useAppHeader(), {
        wrapper: createWrapper({ ...state })
      });
      expect(result.current?.homeLink).toEqual(header.homeLink);
      expect(result.current?.logo).toEqual(header.logo);
      expect(result.current?.title).toEqual(header.title);
      expect(result.current?.menu.length).toEqual(5);
    });
    test('AND THEN the menu items have been assigned a type', () => {
      const { result } = renderHook(() => useAppHeader(), {
        wrapper: createWrapper({ ...state })
      });
      expect(result.current?.menu.length).toEqual(5);
      expect(result.current?.menu[0].type).toEqual('link');
      expect(result.current?.menu[3].type).toEqual('menu');
    });

    describe('AND WHEN invalid menu items are provided', () => {
      let consoleError;
      beforeAll(() => {
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      });
      afterAll(() => {
        jest.restoreAllMocks();
      });
      test('THEN no menu items are returned', () => {
        const { result } = renderHook(() => useAppHeader(), {
          wrapper: createWrapper({ ...inValidMenuState })
        });
        expect(result.current?.menu.length).toEqual(0);
        expect(consoleError).toHaveBeenCalledTimes(1);
      });
    });
  });
});
