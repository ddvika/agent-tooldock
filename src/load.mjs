import {readFileSync} from "node:fs";
import {createRegistry} from "./registry.mjs";
export const data=JSON.parse(readFileSync(new URL("../data/catalog.json",import.meta.url),"utf8"));
export const registry=createRegistry(data);
