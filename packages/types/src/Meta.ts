export type Meta<AdditionalProps> = {
  title?: string;
  // `route` is a fullPath that points to the page, similar to how `page`.`fullPath` does - but this may be an alias instead,
  // so it can be used for presenting more aesthetic URLs etc when used as a site href
  route: string;
  lastModified: Date;
} & Record<string, unknown> &
  AdditionalProps;
