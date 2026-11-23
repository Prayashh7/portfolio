/*
  Errors that are safe to show a user. Anything else that reaches the error
  handler is treated as a bug: logged in full, reported as a generic 500.
*/
export class HttpError extends Error {
  constructor(status, message, fields = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fields = fields;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const unauthorized = (message) => new HttpError(401, message);
export const forbidden = (message) => new HttpError(403, message);
export const notFound = (message) => new HttpError(404, message);
export const invalid = (message, fields) => new HttpError(422, message, fields);

/* Express 4 does not catch rejected promises from async handlers, so every async
   route is wrapped in this. Without it, a failed query would hang the request. */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function parseId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id < 1) throw badRequest("Invalid id.");
  return id;
}
