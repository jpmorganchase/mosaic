const nameToLabelMap = {
  'A-Z': 'Ascending A-Z',
  'Z-A': 'Descending Z-A'
};

export const source = Object.keys(nameToLabelMap);

export const itemToLabel = name => nameToLabelMap[name];
