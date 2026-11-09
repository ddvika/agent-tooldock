#!/usr/bin/env node
import {parseArgs} from "node:util";
import {registry} from "./load.mjs";
import {compactConnection} from "./registry.mjs";
const help=`Agent ToolDock — каталог подключений российских сервисов\n\nnode src/cli.mjs search "ВкусВилл" --protocol MCP\nnode src/cli.mjs search --audience personal --stage order\nnode src/cli.mjs get if-061\nnode src/cli.mjs stats\nnode src/stdio.mjs   # MCP через stdio\n\nФильтры: --audience personal|business|tools, --protocol API|MCP|A2A,\n--access self_serve|conditional, --provenance official|community,\n--stage need|search|compare|prepare|order|pay|after|service,\n--action information|preparation|digital_action|physical_action|unknown,\n--sector "Финтех", --limit 1..50, --offset 0..10000.\n\nПоиск локальный, без ключей и сетевых вызовов. Срез 07.11.2026.`;
try {
  const {values,positionals}=parseArgs({allowPositionals:true,options:Object.fromEntries(["audience","protocol","access","provenance","stage","action","sector","limit","offset"].map(k=>[k,{type:"string"}]).concat([["help",{type:"boolean",short:"h"}]]))});
  const [command,...rest]=positionals;
  if (values.help || !command) {console.log(help);}
  else if (command==="stats") {console.log(JSON.stringify(registry.stats,null,2));}
  else if (command==="get") {console.log(JSON.stringify(registry.get(rest[0]),null,2));}
  else if (command==="search") {const options={...values};delete options.help;for(const k of ["limit","offset"])if(k in options)options[k]=Number(options[k]);const result=registry.search({...options,query:rest.join(" ")});console.log(JSON.stringify({...result,results:result.results.map(compactConnection)},null,2));}
  else {throw new Error("Неизвестная команда. Используйте --help.");}
} catch (error) {console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
