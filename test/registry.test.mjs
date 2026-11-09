import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {data,registry} from "../src/load.mjs";
import {handleRpc} from "../src/mcp.mjs";

test("snapshot preserves research units and evidence",()=>{
 assert.equal(data.rows.length,312);assert.equal(registry.stats.services,232);
 assert.deepEqual(registry.stats.protocols,{API:214,MCP:97,A2A:1});
 assert.equal(new Set(data.rows.map(r=>r.id)).size,312);
 for(const row of data.rows){assert.ok(/^https?:\/\//.test(row.url));assert.ok(row.connection_conditions.length>0);assert.equal(row.checked_at,"2026-11-07");}
});
test("cart preparation never inherits order or payment capability",()=>{
 const result=registry.search({query:"вкусвилл",protocol:"MCP"});assert.equal(result.total,1);
 assert.equal(result.results[0].id,"if-061");assert.deepEqual(result.results[0].write_functions,[]);
 assert.equal(registry.search({query:"вкусвилл",audience:"personal",stage:"order"}).total,0);
 assert.equal(registry.search({query:"вкусвилл",audience:"personal",stage:"prepare"}).total,1);
});
test("personal journey is separate from B2B operations",()=>{
 assert.equal(registry.search({audience:"personal"}).total,59);
 assert.equal(registry.search({audience:"personal",stage:"order"}).total,8);
 assert.equal(registry.search({audience:"personal",stage:"pay"}).total,5);
 assert.equal(registry.search({audience:"business",stage:"order"}).total,55);
 assert.ok(registry.search({provenance:"official",access:"self_serve",limit:50}).results.every(r=>r.provenance==="official"&&r.access==="self_serve"));
});
test("pagination covers the full catalog without duplicates",()=>{
 const ids=[];let offset=0;do{const p=registry.search({offset,limit:37});ids.push(...p.results.map(r=>r.id));offset=p.next_offset;}while(offset!==null);
 assert.equal(ids.length,312);assert.equal(new Set(ids).size,312);
 assert.equal(registry.search({query:"НЕСУЩЕСТВУЮЩИЙСЕРВИС"}).total,0);
});
test("invalid filters fail explicitly",()=>{
 for(const args of [{limit:500},{offset:-1},{protocol:"FTP"},{audience:"public"},{query:42},{typo:true}])assert.throws(()=>registry.search(args));
 assert.throws(()=>registry.get("missing"));
});
test("MCP reports capabilities, evidence and meaningful errors",()=>{
 const call=(method,params={})=>handleRpc({jsonrpc:"2.0",id:1,method,params},registry);
 assert.ok(call("server/discover").result.supportedVersions.includes("2026-07-28"));
 assert.equal(call("initialize",{protocolVersion:"2025-06-18"}).result.protocolVersion,"2025-06-18");
 assert.equal(call("tools/list").result.tools.length,3);
 const result=call("tools/call",{name:"get_connection",arguments:{id:"if-061"}}).result;
 assert.equal(result.isError,false);assert.equal(result.structuredContent.connection.name,"ВкусВилл");
 assert.ok(result.structuredContent.connection.limitations.length);
 assert.equal(call("tools/call",{name:"get_connection",arguments:{id:"missing"}}).result.isError,true);
 assert.equal(call("tools/call",{name:"purchase",arguments:{}}).error.code,-32602);
 assert.equal(call("tools/list",{_meta:{"io.modelcontextprotocol/protocolVersion":"1900-01-01"}}).error.code,-32022);
 assert.equal(call("tools/list",null).error.code,-32602);
});
test("stdio handles a real handshake and call without stdout noise",()=>{
 const messages=[{jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"test",version:"1"}}},{jsonrpc:"2.0",method:"notifications/initialized"},{jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"find_connections",arguments:{protocol:"A2A"}}}];
 const p=spawnSync(process.execPath,[new URL("../src/stdio.mjs",import.meta.url).pathname],{input:messages.map(JSON.stringify).join("\n")+"\n",encoding:"utf8"});
 assert.equal(p.status,0,p.stderr);const out=p.stdout.trim().split("\n").map(JSON.parse);assert.equal(out.length,2);assert.equal(out[1].id,2);assert.equal(out[1].result.structuredContent.total,1);assert.equal(out[1].result.structuredContent.results[0].name,"Альбато");
});
