import { RequestArgs, RequestCtx } from "@projecttacoma/node-fhir-server-core";

// See https://github.com/projecttacoma/node-fhir-server-core/blob/master/docs/ConfiguringProfiles.md
export interface Service<T extends fhir4.FhirResource> {
  /*
   * GET /:base_version/[profile_name]
   * POST /:base_version/[profile_name]/_search
   */
  search?: (args: RequestArgs, ctx: RequestCtx) => Promise<fhir4.Bundle<T>>;

  /*
   * GET /:base_version/[profile_name]/:id
   */
  searchById?: (args: RequestArgs, ctx: RequestCtx) => Promise<T>;

  /*
   * GET /:base_version/[profile_name]/:id/_history/:version_id
   */
  searchByVersionId?: (args: RequestArgs, ctx: RequestCtx) => Promise<T>;

  /*
   * GET /:base_version/[profile_name]/_history
   */
  history?: (args: RequestArgs, ctx: RequestCtx) => Promise<fhir4.Bundle<T>>;

  /*
   * GET /:base_version/[profile_name]/:id/_history
   */
  historyById?: (args: RequestArgs, ctx: RequestCtx) => Promise<T>;

  /*
   * POST /:base_version/[profile_name]
   */
  create?: (
    args: RequestArgs,
    ctx: RequestCtx
  ) => Promise<{ id: string; resource_version?: string }>;

  /*
   * PUT /:base_version/[profile_name]/:id
   */
  update?: (
    args: RequestArgs,
    ctx: RequestCtx
  ) => Promise<{ id: string; resource_version?: string }>;

  /*
   * PATCH /:base_version/[profile_name]/:id
   */
  patch?: (
    args: RequestArgs,
    ctx: RequestCtx
  ) => Promise<{ id: string; resource_version?: string }>;

  /*
   * DELETE /:base_version/[profile_name]/:id
   */
  remove?: (args: RequestArgs, ctx: RequestCtx) => Promise<any>;
}
