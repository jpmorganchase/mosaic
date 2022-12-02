export default class MiddlewareError extends Error {
  /** Response code */
  public status: number;

  /** Related route location */
  public location: string;

  /** Array of errors */
  public errors: string[];

  /** Props to pass back */
  public props: { show404?: boolean; show500?: boolean };

  constructor(
    status: MiddlewareError['status'],
    location: MiddlewareError['location'] = '',
    errors: MiddlewareError['errors'] = [],
    props: MiddlewareError['props'] = {}
  ) {
    super(`${status} error`);
    this.status = status;
    this.location = location;
    this.errors = errors;
    this.props = props;
  }
}
