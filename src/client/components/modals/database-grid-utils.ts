import type { DatabaseColumn, DatabaseRow, DatabaseRowValue } from "../../api";
import type { FilterOperator, GridFilter, GridRowItem, GridSort } from "./database-grid-types";

export function displayDatabaseValue(value: DatabaseRowValue | undefined) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function compareDatabaseValues(left: DatabaseRowValue | undefined, right: DatabaseRowValue | undefined) {
  if (left === right) return 0;
  if (left === null || left === undefined) return 1;
  if (right === null || right === undefined) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function isEmptyValue(value: DatabaseRowValue | undefined) {
  return value === null || value === undefined || value === "";
}

function compareNumeric(left: DatabaseRowValue | undefined, right: string, operator: FilterOperator) {
  const leftNumber = typeof left === "number" ? left : Number(left);
  const rightNumber = Number(right);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;
  return operator === "greater_than" ? leftNumber > rightNumber : leftNumber < rightNumber;
}

function matchesFilter(row: DatabaseRow, filter: GridFilter) {
  const value = row[filter.column];
  const text = displayDatabaseValue(value).toLowerCase();
  const target = filter.value.toLowerCase();

  if (filter.operator === "is_empty") return isEmptyValue(value);
  if (filter.operator === "is_not_empty") return !isEmptyValue(value);
  if (!filter.value) return true;
  if (filter.operator === "equals") return text === target;
  if (filter.operator === "not_equals") return text !== target;
  if (filter.operator === "contains") return text.includes(target);
  if (filter.operator === "not_contains") return !text.includes(target);
  if (filter.operator === "starts_with") return text.startsWith(target);
  if (filter.operator === "ends_with") return text.endsWith(target);
  if (filter.operator === "greater_than" || filter.operator === "less_than") return compareNumeric(value, filter.value, filter.operator);
  return true;
}

export function applyGridFilters(rows: DatabaseRow[], columns: DatabaseColumn[], filters: GridFilter[]): GridRowItem[] {
  const columnNames = new Set(columns.map((column) => column.name));
  const activeFilters = filters.filter((filter) => filter.column && columnNames.has(filter.column));

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => activeFilters.every((filter) => matchesFilter(row, filter)));
}

export function applyGridSort(rows: GridRowItem[], sort: GridSort | null): GridRowItem[] {
  if (!sort?.column) return rows;

  return [...rows].sort((left, right) => {
    const result = compareDatabaseValues(left.row[sort.column], right.row[sort.column]);
    return sort.direction === "asc" ? result : -result;
  });
}
