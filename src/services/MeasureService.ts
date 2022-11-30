import { Service } from "../types/service";

/*
 * Example service that one would implement for the `Measure` resource
 * See the Service interface for all possible functions
 */
export class MeasureService implements Service<fhir4.Measure> {
  // TODO: Remove ts-ignore comment when actually implementing this
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async search() {
    throw new Error("Not implemented");
  }

  // TODO: Remove ts-ignore comment when actually implementing this
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async searchById() {
    throw new Error("Not implemented");
  }
}
