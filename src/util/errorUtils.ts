import { ServerError, constants } from '@projecttacoma/node-fhir-server-core';

/**
 * Child class of ServerError with custom options object
 */
class CustomServerError extends ServerError {
  constructor(message: string, customStatusCode: number, customCode: string) {
    super('', {
      statusCode: customStatusCode,
      issue: [
        {
          severity: 'error',
          code: customCode,
          details: {
            text: message
          }
        }
      ]
    });
  }
}

/**
 * Error class that throws ServerError with status code 404 and code not-found
 */
export class ResourceNotFoundError extends CustomServerError {
  constructor(message: string) {
    super(message, 404, constants.ISSUE.CODE.NOT_FOUND);
  }
}

/**
 * Error class that throws ServerError with status code 400 and code (defaults to 'invalid')
 */
export class BadRequestError extends CustomServerError {
  constructor(message: string, customCode: string = constants.ISSUE.CODE.INVALID) {
    super(message, 400, customCode);
  }
}

/**
 * Error class that throws ServerError with status code 501 and code not-supported
 */
export class NotImplementedError extends CustomServerError {
  constructor(message: string) {
    super(message, 501, constants.ISSUE.CODE.NOT_SUPPORTED);
  }
}
