const dpTable = {
  mobile: {
    maxWidth: '343px'
  },
  tablet: {
    maxWidth: '552px'
  },
  web: {
    maxWidth: '756px'
  },
  desktop: {
    maxWidth: '920px'
  },
  td: {
    mobile: {
      minWidth: '160px'
    },
    tablet: {
      minWidth: '160px'
    },
    web: {
      minWidth: '160px'
    },
    desktop: {
      minWidth: '160px'
    }
  }
};

type TableVars = typeof dpTable;

export const tableVars: TableVars = dpTable;
