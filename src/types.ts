export type UserRole = "treasurer" | "leader" | "coordinator" | "auditor";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  activityScope?: string; // If coordinator, restrict to specific activities
}

export type IncomeType = "participation" | "grant" | "donation" | "activity";

export interface Income {
  id: string;
  date: string; // ISO datetime
  type: IncomeType;
  amount: number; // in TND
  payerName: string;
  method: "cash" | "transfer" | "cheque";
  note?: string;
  receiptNo: string;
  receiptImage?: string; // base64 or URL
  registeredBy: string; // User name
  scoutId?: string; // Related scout if type is participation
  isCancelled?: boolean;
  cancelReason?: string;
  receivedByLeader?: string; // Name of developer who received the cash/receipt
  payerPhone?: string; // whatsapp phone for notifications
  incomeReason?: string; // custom/specific dropdown reason
}

export type ExpenseCategoryCode = string;

export interface ExpenseCategory {
  code: ExpenseCategoryCode;
  labelAr: string;
  labelFr: string;
  emoji: string;
  planned: number;
}

export interface Expense {
  id: string;
  invoiceCode: string; // Unique invoice reference code (e.g., F-2026-001) that the leader writes on paper
  date: string; // ISO datetime/date
  category: ExpenseCategoryCode;
  description: string;
  amount: number;
  qty?: number;
  unitPrice?: number;
  supplier: string;
  paidBy: string;
  authorizedBy: string;
  invoiceImage?: string; // base64 or URL
  invoiceStatus: "existing" | "missing" | "way";
  note?: string;
  status: "approved" | "pending_approval";
  isCancelled?: boolean;
  cancelReason?: string;
  registeredBy: string;
}

export interface Scout {
  id: string;
  name: string;
  regNo: string;
  amountPaid: number;
  dateAdded: string;
}

export interface CampSetup {
  campName: string;
  troopName?: string;
  startDate: string;
  endDate: string;
  scoutCount: number;
  leaderCount: number;
  externalGuidesCount: number;
  scoutFee: number; // typically 50 TND or custom
  plannedBudgets: Record<ExpenseCategoryCode, number>;
  spendingLimitWithoutApproval: number; // expenses > this need leader approval
}

export interface FinancialAlert {
  id: string;
  type: "danger" | "warning" | "warning-orange" | "info" | "success";
  messageAr: string;
  messageFr: string;
  date: string;
}
