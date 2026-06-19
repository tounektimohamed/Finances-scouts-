import { CampSetup, Expense, Income, Scout, User, ExpenseCategoryCode } from "./types";

export const DEMO_USERS: User[] = [
  { id: "u1", name: "أمين المال", role: "treasurer" },
  { id: "u2", name: "قائد الفوج", role: "leader" },
  { id: "u3", name: "مسؤول النشاط", role: "coordinator", activityScope: "activities" },
  { id: "u4", name: "مراجع خارجي", role: "auditor" }
];

export const DEFAULT_CAMP_SETUP: CampSetup = {
  campName: "مخيم الصداقة الصيفي - عين دراهم 2026",
  startDate: "2026-07-01",
  endDate: "2026-07-10",
  scoutCount: 45,
  leaderCount: 8,
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
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  scoutCount: 0,
  leaderCount: 0,
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

export const INITIAL_SCOUTS: Scout[] = [
  { id: "s1", name: "أمين الماجري", regNo: "K-001/26", amountPaid: 60, dateAdded: "2026-06-12" },
  { id: "s2", name: "يوسف الطرابلسي", regNo: "K-002/26", amountPaid: 30, dateAdded: "2026-06-12" }, // Partial
  { id: "s3", name: "سارة بن عبد الله", regNo: "K-003/26", amountPaid: 60, dateAdded: "2026-06-13" },
  { id: "s4", name: "بلال اللواتي", regNo: "K-004/26", amountPaid: 0, dateAdded: "2026-06-13" }, // Unpaid
  { id: "s5", name: "مريم العياري", regNo: "K-005/26", amountPaid: 60, dateAdded: "2026-06-14" },
  { id: "s6", name: "ياسين بن صالح", regNo: "K-006/26", amountPaid: 30, dateAdded: "2026-06-14" }, // Partial
  { id: "s7", name: "فرح الجزيري", regNo: "K-007/26", amountPaid: 60, dateAdded: "2026-06-15" },
  { id: "s8", name: "محمد أمين الورغي", regNo: "K-008/26", amountPaid: 0, dateAdded: "2026-06-15" }, // Unpaid
  { id: "s9", name: "أسماء الوسلاتي", regNo: "K-009/26", amountPaid: 60, dateAdded: "2026-06-16" },
  { id: "s10", name: "حمزة المشرقي", regNo: "K-010/26", amountPaid: 60, dateAdded: "2026-06-16" }
];

export const INITIAL_INCOMES: Income[] = [
  {
    id: "inc1",
    date: "2026-06-15T09:30:00.000Z",
    type: "participation",
    amount: 180, // multiple scouts
    payerName: "أولياء كشافة (أمين، يوسف، سارة)",
    method: "cash",
    receiptNo: "REC-2026-001",
    registeredBy: "علي النفزي (أمين المال)",
    note: "اشتركات معلوم المشاركة للمجموعة الأولى"
  },
  {
    id: "inc2",
    date: "2026-06-16T11:15:00.000Z",
    type: "grant",
    amount: 1000,
    payerName: "منحة بلدية عين دراهم لفرع الكشافة",
    method: "transfer",
    receiptNo: "REC-2026-002",
    registeredBy: "علي النفزي (أمين المال)",
    note: "منحة دعم الأنشطة الصيفية للتخييم للفرع الجهوي"
  },
  {
    id: "inc3",
    date: "2026-06-17T15:45:00.000Z",
    type: "donation",
    amount: 500,
    payerName: "السيد الهادي المغيربي (متبرع)",
    method: "cash",
    receiptNo: "REC-2026-003",
    registeredBy: "علي النفزي (أمين المال)",
    note: "تبرع سخي كشكر للفوج على تنظيم ليلة القدر"
  },
  {
    id: "inc4",
    date: "2026-06-18T10:00:00.000Z",
    type: "activity",
    amount: 150,
    payerName: "عائدات بيع كعك ورشة الكشافة الصغير",
    method: "cash",
    receiptNo: "REC-2026-004",
    registeredBy: "علي النفزي (أمين المال)",
    note: "مداخيل ورشة العمل والحلويات المقدمة من الشبلات"
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "exp1",
    date: "2026-06-15T10:30:00.000Z",
    category: "nutrition",
    description: "شراء لحوم وخضر ودواجن للأسبوع الأول من المندوب الجهوي للمسالخ",
    amount: 320,
    qty: 1,
    unitPrice: 320,
    supplier: "جزار السلام - عين دراهم",
    paidBy: "علي النفزي",
    authorizedBy: "القائد طارق",
    invoiceStatus: "existing",
    status: "approved",
    registeredBy: "علي النفزي (أمين المال)",
    note: "فاتورة لحم البقر والخضر الأساسية"
  },
  {
    id: "exp2",
    date: "2026-06-16T14:00:00.000Z",
    category: "transport",
    description: "قسط أول كراء الحافلة وتأمين تنقل الأفواج من تونس إلى عين دراهم",
    amount: 450,
    qty: 1,
    unitPrice: 450,
    supplier: "الشركة الوطنية للنقل بين المدن",
    paidBy: "علي النفزي",
    authorizedBy: "القائد طارق",
    invoiceStatus: "existing",
    status: "approved",
    registeredBy: "علي النفزي (أمين المال)",
    note: "تأمين حافلة حديثة الذهاب والعودة"
  },
  {
    id: "exp3",
    date: "2026-06-17T11:00:00.000Z",
    category: "lodging",
    description: "معلوم الإيواء وكراء فضاء مركز التخييم بالغابات",
    amount: 250,
    qty: 5,
    unitPrice: 50,
    supplier: "مركب الغابات عين دراهم",
    paidBy: "علي النفزي",
    authorizedBy: "القائد طارق",
    invoiceStatus: "way",
    status: "approved",
    registeredBy: "علي النفزي (أمين المال)",
    note: "حجز مركز التخييم الكشفي"
  },
  {
    id: "exp4",
    date: "2026-06-18T09:00:00.000Z",
    category: "activities",
    description: "حبال كشفية، كرات، أدوات تخشيب وأدوات الرسام الذكي للتحدي",
    amount: 85,
    supplier: "مكتبة النجاح - باب سويقة",
    paidBy: "أنيس الدالي",
    authorizedBy: "علي النفزي",
    invoiceStatus: "missing", // > 50 and missing invoice -> triggers warning!
    status: "approved",
    registeredBy: "أنيس الدالي (مسؤول النشاط)",
    note: "مشتريات عاجلة للورشات التطبيقية"
  },
  {
    id: "exp5",
    date: "2026-06-18T16:30:00.000Z",
    category: "nutrition",
    description: "شراء زبادي وحليب وبيض للفطور الصباحي للكشاف الشاب",
    amount: 110,
    supplier: "مغازة الحرية - عين دراهم",
    paidBy: "علي النفزي",
    authorizedBy: "القائد طارق",
    invoiceStatus: "existing",
    status: "approved",
    registeredBy: "علي النفزي (أمين المال)"
  },
  {
    id: "exp6",
    date: "2026-06-19T08:00:00.000Z",
    category: "printing",
    description: "طباعة لافتات المخيم وبطاقات المشاركين والشارات الكشفية للفوج",
    amount: 280,
    supplier: "مطبعة الفن الحديث",
    paidBy: "علي النفزي",
    authorizedBy: "القائد طارق",
    invoiceStatus: "existing",
    status: "approved", // > 150 require approval, but approved in demo
    registeredBy: "علي النفزي (أمين المال)",
    note: "تجاوز جزئي لميزانية الطباعة المخططة بنسبة عالية"
  },
  {
    id: "exp7",
    date: "2026-06-19T10:15:00.000Z",
    category: "health",
    description: "حقيبة طبية متكاملة لفرقة الجوالة (ضمادات، معقم، أدوية ضرورية)",
    amount: 190,
    supplier: "صيدلية الياسمين عين دراهم",
    paidBy: "القائدة سلمى",
    authorizedBy: "القائد طارق",
    invoiceStatus: "existing",
    status: "pending_approval", // Large expense (>150) pending approval by leader!
    registeredBy: "أمين المال - طارئ",
    note: "أدوية وتأمين صحي إسعافي طارئ"
  }
];

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
