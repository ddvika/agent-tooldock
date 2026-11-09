import {searchProperties,compactConnection,disclaimer} from "./registry.mjs";
export const versions=["2026-07-28","2025-11-25","2025-06-18","2025-03-26","2024-11-05"];
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export const toolDefinitions=[
 {name:"find_connections",title:"Найти подключения российских сервисов",description:"Ищет API, MCP и A2A в реестре публичной документации. Возвращает функции, условия и ограничения. Не подключает сервисы и не выполняет операции. Для личного агента задайте audience=personal. Этап order не означает выполненную доставку, prepare не означает покупку. Нулевой результат относится только к выборке.",inputSchema:{type:"object",properties:searchProperties,additionalProperties:false},annotations},
 {name:"get_connection",title:"Открыть условия и источники подключения",description:"Полная запись по ID: функции, доступ, авторство, ограничения и первичные источники. Перед рекомендацией интеграции откройте эту запись и актуальную документацию. Дата среза 07.11.2026.",inputSchema:{type:"object",properties:{id:{type:"string",description:"ID из find_connections, например if-061"}},required:["id"],additionalProperties:false},annotations},
 {name:"catalog_stats",title:"Разделы и статистика каталога",description:"Количество подключений и сервисов, протоколы и точные названия разделов для фильтрации. Одному сервису может соответствовать несколько подключений.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations}
];
export function rpcError(id,code,message,data) {return {jsonrpc:"2.0",id:id??null,error:{code,message,...(data?{data}:{})}};}
/** Pure JSON-RPC handler shared by stdio and the hosted transport. */
export function handleRpc(message,registry) {
  if (!message || typeof message!=="object" || Array.isArray(message) || message.jsonrpc!=="2.0" || typeof message.method!=="string" || ("id" in message && typeof message.id!=="string" && typeof message.id!=="number")) return rpcError(null,-32600,"Invalid Request");
  const {id,method,params={}}=message;
  if (!("id" in message)) return null;
  if (!params || typeof params!=="object" || Array.isArray(params)) return rpcError(id,-32602,"Invalid params");
  const success=result=>({jsonrpc:"2.0",id,result});
  const version=params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  if (version && !versions.includes(version)) return rpcError(id,-32022,"Unsupported protocol version",{supported:versions,requested:version});
  if (method==="server/discover") return success({resultType:"complete",_meta:{"io.modelcontextprotocol/serverInfo":{name:"agent-tooldock",version:"0.1.0",title:"Agent ToolDock"}},supportedVersions:versions,capabilities:{tools:{}},instructions:disclaimer});
  if (method==="initialize") return success({protocolVersion:versions.slice(1).includes(params.protocolVersion)?params.protocolVersion:"2025-06-18",serverInfo:{name:"agent-tooldock",version:"0.1.0",title:"Agent ToolDock"},capabilities:{tools:{}},instructions:disclaimer});
  if (method==="ping") return success({});
  if (method==="tools/list") return success({resultType:"complete",tools:toolDefinitions});
  if (method!=="tools/call") return rpcError(id,-32601,"Method not found");
  if (!params || typeof params!=="object" || !toolDefinitions.some(t=>t.name===params.name)) return rpcError(id,-32602,"Unknown tool");
  try {
    let result; const args=params.arguments??{};
    if (!args || typeof args!=="object" || Array.isArray(args)) throw new Error("arguments must be an object");
    if (params.name==="find_connections") {result=registry.search(args);result={...result,results:result.results.map(compactConnection)};}
    if (params.name==="get_connection") {if(Object.keys(args).some(k=>k!=="id"))throw new Error("Неизвестный параметр");result=registry.get(args.id);}
    if (params.name==="catalog_stats") {if(Object.keys(args).length)throw new Error("catalog_stats не принимает параметры");result=registry.stats;}
    return success({resultType:"complete",content:[{type:"text",text:JSON.stringify(result)}],structuredContent:result,isError:false});
  } catch (error) {return success({resultType:"complete",isError:true,content:[{type:"text",text:error instanceof Error?error.message:"Tool failed"}]});}
}
