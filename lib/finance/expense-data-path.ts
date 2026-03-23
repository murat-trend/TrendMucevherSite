import path from "path";

export function getExpensesJsonPath(): string {
  return path.join(process.cwd(), "data", "finance", "expenses.json");
}

export function getFinanceBackupsDir(): string {
  return path.join(process.cwd(), "data", "finance", "backups");
}
