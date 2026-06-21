import { CampSetup, Expense, Income, Scout, User, ExpenseCategoryCode } from "./types";

export const DEMO_USERS: User[] = [
  { id: "u1", name: "أمين المال", role: "treasurer" },
  { id: "u2", name: "قائد النشاط", role: "leader" }
];

export const DEFAULT_CAMP_SETUP: CampSetup = {
  campName: "مخيم الصداقة الصيفي - عين دراهم 2026",
  troopName: "فوج الكشافة بقرطاج",
  startDate: "2026-07-01",
  endDate: "2026-07-10",
  scoutCount: 45,
  leaderCount: 8,
  externalGuidesCount: 3,
  scoutFee: 60, // 60 TND per scout
  plannedBudgets: {
    nutrition: 1500,
    transport: 800,
    lodging: 1200,
    activities: 500,
    printing: 300,
    health: 200,
    media: 155,
    misc: 400
  },
  spendingLimitWithoutApproval: 150 // Expenses over 150 TND require Leader approval
};

export const EMPTY_CAMP_SETUP: CampSetup = {
  campName: "مخيّم فوج الكشافة الصيفي",
  troopName: "فوج الكشافة",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  scoutCount: 0,
  leaderCount: 0,
  externalGuidesCount: 0,
  scoutFee: 50, // default 50 TND
  plannedBudgets: {
    nutrition: 0,
    transport: 0,
    lodging: 0,
    activities: 0,
    printing: 0,
    health: 0,
    media: 0,
    misc: 0
  },
  spendingLimitWithoutApproval: 100 // default 100 TND without approval
};

export const INITIAL_SCOUTS: Scout[] = [];

export const INITIAL_INCOMES: Income[] = [];

export const INITIAL_EXPENSES: Expense[] = [];

export const CATEGORIES_LIST: { code: ExpenseCategoryCode; labelAr: string; labelFr: string; emoji: string }[] = [
  { code: "nutrition", labelAr: "التغذية 🍞", labelFr: "Nutrition 🍞", emoji: "🍞" },
  { code: "transport", labelAr: "النقل 🚌", labelFr: "Transport 🚌", emoji: "🚌" },
  { code: "lodging", labelAr: "الإيواء ⛺", labelFr: "Hébergement ⛺", emoji: "⛺" },
  { code: "activities", labelAr: "الأنشطة والمواد 🎨", labelFr: "Activités 🎨", emoji: "🎨" },
  { code: "printing", labelAr: "الأزياء والطباعة 👕", labelFr: "Tenues & Impression 👕", emoji: "👕" },
  { code: "health", labelAr: "الصحة والتأمين 💊", labelFr: "Santé & Assurance 💊", emoji: "💊" },
  { code: "media", labelAr: "الإعلام والنشر 📢", labelFr: "Média & Com 📢", emoji: "📢" },
  { code: "misc", labelAr: "متفرقات 🔧", labelFr: "Divers 🔧", emoji: "🔧" }
];
