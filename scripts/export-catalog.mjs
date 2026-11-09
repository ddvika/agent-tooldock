import { writeFileSync } from "node:fs";
import { data } from "../src/load.mjs";

const columns = [
  ["id", "ID"],
  ["name", "Сервис"],
  ["protocol", "Подключение"],
  ["sector", "Раздел"],
  ["primary_group", "Основное назначение"],
  ["provenance", "Кто сделал"],
  ["access", "Доступ"],
  ["read_functions", "Получение информации"],
  ["prepare_functions", "Подготовка"],
  ["write_functions", "Действия"],
  ["connection_conditions", "Условия подключения"],
  ["limitations", "Ограничения"],
  ["url", "Документация"],
  ["evidence_urls", "Источники"],
  ["checked_at", "Дата изучения"]
];

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  const safeText = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + safeText.replaceAll('"', '""') + '"';
}

const header = columns.map(([, label]) => csvCell(label)).join(",");
const rows = data.rows.map(row => columns.map(([key]) => csvCell(row[key])).join(","));
writeFileSync(new URL("../data/catalog.csv", import.meta.url), "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n");
console.log(`Exported ${data.rows.length} connections to data/catalog.csv.`);
