export type ExpenseInvoice = {
  /** Sunucudaki yol: /uploads/invoices/... */
  url: string;
  originalName: string;
};

export type ExpenseRow = {
  id: string;
  /** YYYY-MM-DD */
  dateIso: string;
  description: string;
  category: string;
  /** TRY */
  amountTry: number;
  /** Bir satırda birden fazla fatura (ör. reklam ödemesi 2–3 faturadan oluşabilir) */
  invoices: ExpenseInvoice[];
};

/** Eski localStorage kayıtları (tek fatura alanı) */
type LegacyExpenseRow = Partial<ExpenseRow> & {
  invoiceUrl?: string | null;
  invoiceOriginalName?: string | null;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyExpenseRow(): ExpenseRow {
  const d = new Date();
  return {
    id: newId(),
    dateIso: d.toISOString().slice(0, 10),
    description: "",
    category: "",
    amountTry: 0,
    invoices: [],
  };
}

export function normalizeExpenseRow(raw: unknown): ExpenseRow {
  const base = createEmptyExpenseRow();
  if (!raw || typeof raw !== "object") return base;

  const r = raw as LegacyExpenseRow;
  const id = typeof r.id === "string" && r.id ? r.id : base.id;
  const dateIso =
    typeof r.dateIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.dateIso) ? r.dateIso : base.dateIso;
  const description = typeof r.description === "string" ? r.description : "";
  const category = typeof r.category === "string" ? r.category : "";
  const amountTry =
    typeof r.amountTry === "number" && Number.isFinite(r.amountTry) ? r.amountTry : 0;

  let invoices: ExpenseInvoice[] = [];
  if (Array.isArray(r.invoices)) {
    invoices = r.invoices
      .filter(
        (inv): inv is ExpenseInvoice =>
          typeof inv === "object" &&
          inv !== null &&
          typeof (inv as ExpenseInvoice).url === "string" &&
          (inv as ExpenseInvoice).url.length > 0,
      )
      .map((inv) => ({
        url: inv.url,
        originalName: typeof inv.originalName === "string" && inv.originalName ? inv.originalName : "Fatura",
      }));
  } else if (typeof r.invoiceUrl === "string" && r.invoiceUrl) {
    invoices = [
      {
        url: r.invoiceUrl,
        originalName:
          typeof r.invoiceOriginalName === "string" && r.invoiceOriginalName
            ? r.invoiceOriginalName
            : "Fatura",
      },
    ];
  }

  return { id, dateIso, description, category, amountTry, invoices };
}
