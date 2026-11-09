import { registry } from "../src/load.mjs";

const result = registry.search({ query: "ВкусВилл", protocol: "MCP" });

console.log("Agent ToolDock");
console.log(`${registry.stats.connections} connections · ${registry.stats.services} services · ${registry.stats.snapshot_date}`);
console.log("\nFind a documented MCP for a grocery basket");
console.log('Query  {"query":"ВкусВилл","protocol":"MCP"}');
console.log(`Matches  ${result.total}`);

for (const row of result.results) {
  console.log(`\n${row.name} / ${row.protocol} / ${row.id}`);
  console.log("\nDocumented capabilities");
  for (const action of [...row.read_functions, ...row.prepare_functions, ...row.write_functions]) {
    console.log(`  • ${action}`);
  }
  console.log("\nAccess conditions");
  for (const condition of row.connection_conditions) console.log(`  • ${condition}`);
  console.log("\nLimits");
  for (const limit of row.limitations) console.log(`  • ${limit}`);
  console.log(`\nDocumentation  ${row.url}`);
}

console.log(`\n${result.disclaimer}`);
