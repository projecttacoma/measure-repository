import { initialize } from "@projecttacoma/node-fhir-server-core";
import { serverConfig } from "./config/serverConfig";

const server = initialize(serverConfig);

server.listen(3000, () => {
  console.log("Server listening");
});
