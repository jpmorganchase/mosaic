type GutterTopEnum =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 13
  | 20
  | 32
  | 'component'
  | 'group'
  | 'groupItem'
  | 'none'
  | 'paragraph';
export type GutterTop = GutterTopEnum | undefined;

export type TypographySize =
  | 's40'
  | 's50'
  | 's60'
  | 's70'
  | 's80'
  | 's90'
  | 's100'
  | 's110'
  | 's120'
  | 's130'
  | 's140'
  | 's150'
  | 's180'
  | 's210'
  | 's240';

export type TypographyWeight = 'light' | 'regular' | 'semibold' | 'bold' | 'extrabold';

export type Color =
  | 'neutral'
  | 'accent'
  | 'primary'
  | 'inverted-neutral'
  | 'inverted-accent'
  | 'inverted-primary';

export type Size = 'small' | 'medium' | 'large';

export type BrandColorVariants = 'brand1' | 'brand2' | 'brand3' | 'brand4' | 'brand5' | 'brand6';
