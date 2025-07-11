export class NotFoundError extends Error {
  constructor(reason?: string) {
    super(`Couldn't find a source: ${reason ?? 'not found'}`);
    this.name = 'NotFoundError';
  }
}
