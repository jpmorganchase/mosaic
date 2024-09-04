import { describe, test, expect } from 'vitest';
import { SidebarData, sortSidebarData } from '../sortSidebarData.js';

describe('GIVEN the sortSidebarData comparator', () => {
  describe('WHEN pages have a shared sort config', () => {
    describe('AND WHEN sorting by a date in descending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('01 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('05 May 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('03 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('31 Oct 2023').getTime()
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting by a date in ascending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('01 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('05 May 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('03 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('31 Oct 2023').getTime()
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting by a number in descending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 1
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 3
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 2
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 4
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting by a number in ascending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 1
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 3
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 2
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 4
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting by a string in descending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'y'
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting by a string in ascending order', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'y'
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
        }
      });
    });

    describe('AND WHEN sorting, priority trumps shared sort config', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: 10,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'y'
              }
            }
          ]
        }
      ];

      test('THEN the sidebar nodes are ordered correctly', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('01 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
        }
      });
    });
  });

  describe('AND WHEN there is **NO** shared sort config', () => {
    describe('WHEN sorted', () => {
      const data: SidebarData[] = [
        {
          id: 'index',
          kind: 'group',
          name: 'index page',
          priority: undefined,
          childNodes: [
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' }
            },
            {
              id: 'id',
              kind: 'data',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' }
            }
          ]
        }
      ];

      test('THEN no sorting is applied', () => {
        const sorted = sortSidebarData(data);
        expect(sorted[0].kind).toEqual('group');
        if (sorted[0].kind === 'group') {
          expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
          expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
          expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
        }
      });
    });
  });
});
