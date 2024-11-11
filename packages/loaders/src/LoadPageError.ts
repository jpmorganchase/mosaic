export class LoadPageError extends Error {
  statusCode: number;
  constructor({ message, statusCode }: { message: string; statusCode: number }) {
    super(message);
    this.statusCode = statusCode;
  }
}
