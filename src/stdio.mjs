#!/usr/bin/env node
import {createInterface} from "node:readline";
import {registry} from "./load.mjs";
import {handleRpc,rpcError} from "./mcp.mjs";
const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
for await (const line of lines) {
  if (!line.trim()) continue;
  let response;
  try {response=handleRpc(JSON.parse(line),registry);}
  catch {response=rpcError(null,-32700,"Parse error");}
  if (response) process.stdout.write(JSON.stringify(response)+"\n");
}
