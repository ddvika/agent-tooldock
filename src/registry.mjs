/** Shared query engine. No network requests or provider credentials. */
export const disclaimer = "Обзор публичной документации на 07.11.2026. Доступ и операции не проверялись живыми вызовами. Каталог помогает выбрать подключение; доступ к самому сервису оформляется отдельно.";
export const normalize = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replaceAll("ё", "е");
export const stageNames = {need:"Понять потребность",search:"Найти информацию",compare:"Сравнить варианты",prepare:"Подготовить действие",order:"Оформить заказ",pay:"Оплатить",after:"Статус и история",service:"Другие задачи"};
export const groupNames = {personal:"Личные задачи",business:"Для бизнеса",tools:"Разработка и данные"};
export const actionNames = {information:"Получение информации",preparation:"Подготовка действия",digital_action:"Цифровые действия",physical_action:"Физический результат",unknown:"Функции требуют уточнения"};
export const accessNames = {self_serve:"Самостоятельный доступ",conditional:"Есть условия подключения"};
export const searchProperties = {
  query:{type:"string",maxLength:200,description:"Название сервиса или ключевые слова. Поиск по опубликованным функциям, не семантическая проверка возможности."},
  protocol:{type:"string",enum:["API","MCP","A2A"]},
  audience:{type:"string",enum:["personal","business","tools"],description:"personal включает основной и дополнительный личный сценарий. business включает B2B-сценарий. Группы могут пересекаться."},
  access:{type:"string",enum:["self_serve","conditional"]},
  provenance:{type:"string",enum:["official","community"]},
  sector:{type:"string",maxLength:120,description:"Точное название раздела из catalog_stats."},
  stage:{type:"string",enum:Object.keys(stageNames),description:"Документированный этап. При audience=personal проверяется только личный сценарий; при business только B2B."},
  action:{type:"string",enum:Object.keys(actionNames)},
  limit:{type:"integer",minimum:1,maximum:50,default:10},
  offset:{type:"integer",minimum:0,maximum:10000,default:0}
};

export function validateSearch(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error("Параметры должны быть объектом.");
  for (const [key,value] of Object.entries(options)) {
    const schema = searchProperties[key];
    if (!schema) throw new Error(`Неизвестный параметр: ${key}`);
    if (value === undefined || value === "") continue;
    if (schema.type === "integer" && (!Number.isInteger(value) || value < schema.minimum || value > schema.maximum)) throw new Error(`Неверное значение ${key}. Допустимо от ${schema.minimum} до ${schema.maximum}.`);
    if (schema.type === "string" && (typeof value !== "string" || value.length > (schema.maxLength ?? 200))) throw new Error(`Неверное значение ${key}.`);
    if (schema.enum && !schema.enum.includes(value)) throw new Error(`Неверное значение ${key}: ${value}`);
  }
  return options;
}

/** @param {{date:string,rows:Array<any>}} data */
export function createRegistry(data) {
  const indexed = data.rows.map((r) => ({row:r, text:normalize([r.name,r.connection_title,r.sector,r.description,...r.read_functions,...r.prepare_functions,...r.write_functions].join(" "))}));
  const ids = new Map(data.rows.map(r=>[r.id,r]));
  const countBy = (key) => data.rows.reduce((a,r)=>(a[r[key]]=(a[r[key]]??0)+1,a),{});
  const stats = {
    snapshot_date:data.date, connections:data.rows.length, services:new Set(data.rows.map(r=>r.name)).size,
    protocols:countBy("protocol"), primary_audiences:countBy("primary_group"), provenance:countBy("provenance"), access:countBy("access"),
    personal_scenarios:data.rows.filter(r=>r.consumer_stages.length>0).length,
    sectors:Object.entries(countBy("sector")).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"ru")),
    disclaimer
  };
  /** @param {Record<string,any>} options */
  function search(options = {}) {
    validateSearch(options);
    const {query="",protocol,audience,access,provenance,sector,stage,action,limit=10,offset=0}=options;
    // A few explicit task synonyms keep Russian case endings from hiding obvious matches.
    const synonyms={"корзина":"корзин","корзину":"корзин","доставка":"достав","доставку":"достав","платежи":"платеж","платеж":"платеж","финансы":"финанс"};
    const tokens=normalize(query).trim().split(/\s+/).filter(Boolean).map(t=>synonyms[t]??t);
    const hits=indexed.filter(({row:r,text})=>{
      if (protocol && r.protocol!==protocol) return false;
      if (audience==="personal" && r.consumer_stages.length===0) return false;
      if (audience==="business" && r.business_stages.length===0) return false;
      if (audience==="tools" && r.primary_group!=="tools") return false;
      if (access && r.access!==access) return false;
      if (provenance && r.provenance!==provenance) return false;
      if (sector && r.sector!==sector) return false;
      if (action && r.action_class!==action) return false;
      if (stage) {
        const stages=audience==="personal"?r.consumer_stages:audience==="business"?r.business_stages:[...r.consumer_stages,...r.business_stages];
        if (!stages.includes(stage)) return false;
      }
      return tokens.every(token=>text.includes(token));
    }).map(({row:r})=>r);
    const score=r=>(query && normalize(r.name).includes(normalize(query))?100:0)+(r.provenance==="official"?10:0)+(r.access==="self_serve"?5:0)+(r.consumer_stages.length>0?1:0);
    hits.sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name,"ru")||a.protocol.localeCompare(b.protocol));
    return {snapshot_date:data.date,total:hits.length,offset,limit,next_offset:offset+limit<hits.length?offset+limit:null,results:hits.slice(offset,offset+limit),disclaimer};
  }
  function get(id) {
    if (typeof id!=="string" || !ids.has(id)) throw new Error("Подключение не найдено. Сначала используйте find_connections.");
    return {snapshot_date:data.date,connection:ids.get(id),disclaimer};
  }
  return {search,get,stats};
}

export function compactConnection(r) {
  return {id:r.id,name:r.name,protocol:r.protocol,title:r.connection_title,sector:r.sector,primary_audience:r.primary_group,provenance:r.provenance,access:r.access,
    functions:{read:r.read_functions,prepare:r.prepare_functions,write:r.write_functions},consumer_stages:r.consumer_stages,business_stages:r.business_stages,
    limitations:r.limitations,connection_conditions:r.connection_conditions,documentation_url:r.url,endpoint:r.endpoint,checked_at:r.checked_at};
}
