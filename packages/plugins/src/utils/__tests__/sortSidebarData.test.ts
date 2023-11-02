import { type SidebarDataNode, sortSidebarData } from '../sortSidebarData.js';

describe('GIVEN the sortSidebarData comparator', () => {
  describe('WHEN pages have a shared sort config', () => {
    describe('AND WHEN sorting by a date in descending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('01 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('05 May 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'desc',
                fieldData: new Date('03 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting by a date in ascending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('01 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('05 May 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'date',
                arrange: 'asc',
                fieldData: new Date('03 Jan 2023').getTime()
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting by a number in descending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 1
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 3
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'desc',
                fieldData: 2
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting by a number in ascending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 1
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 3
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'number',
                arrange: 'asc',
                fieldData: 2
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting by a string in descending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'desc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('31 Oct 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('01 Jan 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting by a string in ascending order', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
      });
    });

    describe('AND WHEN sorting, priority trumps shared sort config', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'a'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: 10,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'm'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
              sharedSortConfig: {
                field: 'field',
                dataType: 'string',
                arrange: 'asc',
                fieldData: 'd'
              }
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: [],
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

        expect(sorted[0].childNodes[0].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('01 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
      });
    });
  });

  describe('AND WHEN there is **NO** shared sort config', () => {
    describe('WHEN sorted', () => {
      const data: SidebarDataNode[] = [
        {
          id: 'index',
          fullPath: 'fullPath',
          name: 'index page',
          priority: undefined,
          data: { level: 3, link: '/index' },
          childNodes: [
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '01 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: []
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '05 May 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: []
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '03 Jan 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: []
            },
            {
              id: 'id',
              fullPath: 'fullPath',
              name: '31 Oct 2023 Newsletter',
              priority: undefined,
              data: { level: 3, link: '/id' },
              childNodes: []
            }
          ]
        }
      ];

      test('THEN no sorting is applied', () => {
        const sorted = sortSidebarData(data);

        expect(sorted[0].childNodes[0].name).toEqual('01 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[1].name).toEqual('05 May 2023 Newsletter');
        expect(sorted[0].childNodes[2].name).toEqual('03 Jan 2023 Newsletter');
        expect(sorted[0].childNodes[3].name).toEqual('31 Oct 2023 Newsletter');
      });
    });
  });
});
