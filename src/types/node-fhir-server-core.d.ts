// See https://github.com/projecttacoma/node-fhir-server-core/blob/master/packages/node-fhir-server-core/src/index.js
declare module "@projecttacoma/node-fhir-server-core" {
  export const constants: {
    ISSUE: {
      SEVERITY: {
        FATAL: "fatal";
        ERROR: "error";
        WARNING: "warning";
        INFO: "information";
      };
      // Codes defined here: https://www.hl7.org/fhir/valueset-issue-type.html
      CODE: {
        // Invalid can be seen as a parent essentially to these, see Level on above url
        // This means structure, required, value, and invariant, are all also invalid
        // you can send invalid back or something more specific
        INVALID: "invalid";
        STRUCTURE: "structure";
        REQUIRED: "required";
        VALUE: "value";
        INVARIANT: "invariant";
        // Security is parent of login, unknown, expired, forbidden, and suppressed
        SECURITY: "security";
        LOGIN: "login";
        UNKNOWN: "unknown";
        EXPIRED: "expired";
        FORBIDDEN: "forbidden";
        SUPPRESSED: "suppressed";
        // Procesing has no parent/children
        PROCESSING: "processing";
        // Not Supported is parent of duplicate, not found, and too long
        NOT_SUPPORTED: "not-supported";
        DUPLICATE: "duplicate";
        NOT_FOUND: "not-found";
        TOO_LONG: "too-long";
        // Code invalid is parent of extension, too costly, business rule, conflict, and incomplete
        CODE_INVALID: "code-invalid";
        EXTENSION: "extension";
        TOO_COSTLY: "too-costly";
        BUSINESS_RULE: "business-rule";
        CONFLICT: "conflict";
        INCOMPLETE: "incomplete";
        // Transient is parent of lock error, no store, exception, timeout, and throttled
        TRANSIENT: "transient";
        LOCK_ERROR: "lock-error";
        NO_STORE: "no-store";
        EXCEPTION: "exception";
        TIMEOUT: "timeout";
        THROTTLED: "throttled";
        // Informational has no parent/children
        INFORMATIONAL: "informational";
      };
    };

    /**
     * Interactions Types.  Also the name of the controller methods
     */
    INTERACTIONS: {
      SEARCH: "search";
      SEARCH_BY_ID: "searchById";
      SEARCH_BY_VID: "searchByVersionId";
      HISTORY: "history";
      HISTORY_BY_ID: "historyById";
      CREATE: "create";
      UPDATE: "update";
      DELETE: "remove";
      PATCH: "patch";
      OPERATIONS_POST: "operationsPost";
      OPERATIONS_GET: "operationsGet";
    };

    /**
     * These are currently the only versions we support
     */
    VERSIONS: {
      "1_0_2": "1_0_2";
      "2_0_0": "2_0_0";
      "3_0_1": "3_0_1";
      "4_0_0": "4_0_0";
      "4_0_1": "4_0_1";
    };

    /**
     * Custom events we support
     */
    EVENTS: {
      AUDIT: "audit-event";
      PROVENANCE: "provenance";
    };

    RESOURCES: {
      PRACTITIONER: "practitioner";
    };
  };

  export type OperationConfig = {
    name: string;
    route: string;
    method: "GET" | "POST";
    reference?: string;
  };

  export type ProfileConfig = {
    service: string | any;
    versions: (keyof typeof constants.VERSIONS)[];
    corsOptions?: Record<string, any>;
    operation?: OperationConfig[];
  };

  export type FhirResourceType = fhir4.FhirResource["resourceType"];

  export type ServerConfig = {
    profiles: Partial<Record<FhirResourceType, ProfileConfig>>;
  };

  export class ServerError extends Error {
    constructor(message: string, options: any);
  }

  export class Server {
    constructor(config: ServerConfig, app: any);
    configureMiddleware(): Server;
    configureHelmet(helmetConfig: any): Server;
    configureSession(session: any): Server;
    configureAuthorization(): Server;
    configurePassport(): Server;
    setPublicDirectory(publicDirectory?: string): Server;
    setProfileRoutes(): Server;
    configureLoggers(fun: (containers: any, transports: any) => void): Server;
    setErrorRoutes(): void;
    listen(port: number): void;
    listen(port: number, host: string): void;
    listen(callback: () => void): void;
    listen(port: number, callback: () => void): void;
    listen(port: number, host: string, callback: () => void): void;
  }

  export function resolveSchema(
    version: keyof typeof constants.VERSIONS,
    schema: string
  ): any;

  export function getSearchParameters(
    profile: string,
    version: keyof typeof constants.VERSIONS,
    customArgsModule?: string,
    logger?: any
  ): any;

  export const loggers: any;

  export function initialize(config: ServerConfig, app?: any): Server;

  export type RequestArgs = Record<string, any>;
  export type RequestCtx = { req: any };
}
