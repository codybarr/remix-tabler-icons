import manifest from "../generated/manifest.json";
import { createWorker, type Manifest } from "./worker-handler.ts";

export default createWorker(manifest as Manifest);
