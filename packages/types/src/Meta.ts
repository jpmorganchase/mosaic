type Meta<AdditionalProps> = {
  title?: string;
  // `friendlyRoute` is a route that points to the page, similar to how `page`.`route` does - but this may be an alias instead,
  // so it can be used for presenting more aesthetic URLs etc when used as a site href
  friendlyRoute: string;
  lastModified: Date;
} & Record<string, unknown> &
  AdditionalProps;
export default Meta;
