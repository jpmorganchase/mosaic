const spaceScale = (ratio: number, offset = 0, base = 4, unit = 'px') =>
  `${ratio * base + offset}${unit}`;

export const space = {
  none: spaceScale(0),
  base: spaceScale(1),
  anchor: '-0.8rem',
  gutter: spaceScale(-4),
  x1: spaceScale(1),
  x2: spaceScale(2),
  x3: spaceScale(3),
  x4: spaceScale(4),
  x5: spaceScale(5),
  x6: spaceScale(6),
  x8: spaceScale(8),
  x10: spaceScale(10),
  x12: spaceScale(12),
  x13: spaceScale(13),
  x15: spaceScale(15),
  x20: spaceScale(20),
  x25: spaceScale(25),
  x30: spaceScale(30)
};

export const vertical = {
  auto: 'auto',
  none: space.none,
  x1: space.x1,
  x2: space.x2,
  x3: space.x3,
  x4: space.x4,
  x5: space.x5,
  x6: space.x6,
  x8: space.x8,
  x10: space.x10,
  x12: space.x12,
  x13: space.x13,
  x15: space.x15,
  x20: space.x20,
  x25: space.x25,
  x30: space.x30
};

export const horizontal = {
  anchor: space.anchor,
  auto: 'auto',
  none: space.none,
  gutter: space.gutter,
  x1: space.x1,
  x2: space.x2,
  x3: space.x3,
  x4: space.x4,
  x5: space.x5,
  x6: space.x6,
  x8: space.x8,
  x10: space.x10,
  x12: space.x12,
  x13: space.x13,
  x15: space.x15,
  x20: space.x20,
  x25: space.x25,
  x30: space.x30
};

export type SpaceVars = {
  none: string;
  horizontal: typeof horizontal;
  vertical: typeof vertical;
};

export const spaceVars: SpaceVars = {
  none: spaceScale(0),
  horizontal,
  vertical
};
