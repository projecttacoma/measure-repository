import { ServerError } from '@projecttacoma/node-fhir-server-core';

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
 * Error class that throws ServerError with status code 404 and code ResourceNotFound
 */
export class ResourceNotFoundError extends CustomServerError {
  constructor(message: string) {
    super(message, 404, 'ResourceNotFound');
  }
}
