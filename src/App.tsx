import React, { useState, useEffect } from "react";
import { User, Expense, Income, Scout, CampSetup, ExpenseCategoryCode, IncomeType } from "./types";
import { 
  DEMO_USERS, 
  DEFAULT_CAMP_SETUP,
  EMPTY_CAMP_SETUP,
  CATEGORIES_LIST
} from "./initialData";
import { formatTND, formatDate, calculateCampDays } from "./utils/helpers";

import {
  useCampSetup,
  useScoutsCollection,
  useIncomesCollection,
  useExpensesCollection,
  useCategories,
  useTroopImages,
} from "./lib/firestoreService";

const INCOME_REASONS = [
  { code: "camp_participation", labelAr: "اشتراك مخيم", labelFr: "Participation au camp" },
  { code: "grant", labelAr: "منحة", labelFr: "Subvention" }
];

import DashboardOverview from "./components/DashboardOverview";
import TransactionsList from "./components/TransactionsList";
import ScoutManager from "./components/ScoutManager";
import BudgetComparison from "./components/BudgetComparison";
import CampSettings from "./components/CampSettings";
import ReportExports from "./components/ReportExports";
import ReceiptModal from "./components/ReceiptModal";

import { 
  Compass, LayoutDashboard, Landmark, Coins, FileCheck2, 
  Sparkles, Sliders, Moon, Sun, Languages, LogOut, ArrowRightLeft,
  XCircle, PlusCircle, AlertTriangle, ShieldCheck
} from "lucide-react";

export default function App() {
  const [locale, setLocale] = useState<"ar" | "fr">("ar");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("scout_current_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [selectedRole, setSelectedRole] = useState("");
  const [loginError, setLoginError] = useState("");

  const { setup: campSetup, saveCampSetup } = useCampSetup();
  const { scouts, upsertScout, updateScout } = useScoutsCollection();
  const { incomes, upsertIncome, updateIncome } = useIncomesCollection();
  const { expenses, upsertExpense, updateExpense } = useExpensesCollection();
  const { categories, saveCategories } = useCategories();
  const { stamp: troopStamp, leaderSignature, treasurerSignature, saveStamp: setTroopStamp, saveLeaderSignature: setLeaderSignature, saveTreasurerSignature: setTreasurerSignature } = useTroopImages();

  const [selectedReceiptIncome, setSelectedReceiptIncome] = useState<Income | null>(null);
  const [sendingStatus, setSendingStatus] = useState<string | null>(null);

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [expCategory, setExpCategory] = useState<ExpenseCategoryCode>("nutrition");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expQty, setExpQty] = useState<number>(1);
  const [expPrice, setExpPrice] = useState<number>(0);
  const [expSupplier, setExpSupplier] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expInvoiceStatus, setExpInvoiceStatus] = useState<"existing" | "missing" | "way">("missing");
  const [expInvoiceImage, setExpInvoiceImage] = useState<string | null>(null);
  const [expNote, setExpNote] = useState("");
  const [expInvoiceCode, setExpInvoiceCode] = useState("");

  useEffect(() => {
    if (showExpenseModal && !expInvoiceCode) {
      let nextNum = 1;
      expenses.forEach(e => {
        if (e.invoiceCode && e.invoiceCode.startsWith("F-26-")) {
          const numPart = e.invoiceCode.substring(5);
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed >= nextNum) {
            nextNum = parsed + 1;
          }
        }
      });
      const paddedNum = String(nextNum).padStart(3, "0");
      setExpInvoiceCode(`F-26-${paddedNum}`);
    }
  }, [showExpenseModal, expenses, expInvoiceCode]);

  const [incType, setIncType] = useState<IncomeType>("participation");
  const [incAmount, setIncAmount] = useState<number>(0);
  const [incPayer, setIncPayer] = useState("");
  const [incMethod, setIncMethod] = useState<"cash" | "cheque" | "transfer">("cash");
  const [incNote, setIncNote] = useState("");
  const [incReceivedBy, setIncReceivedBy] = useState("");
  const [incReasonCode, setIncReasonCode] = useState("camp_participation");
  const [incPayerPhone, setIncPayerPhone] = useState("");
  const [incSelectedScoutId, setIncSelectedScoutId] = useState("");

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("scout_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("scout_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!selectedRole) {
      setLoginError(locale === "ar" ? "يرجى اختيار الحساب القيادي" : "Veuillez sélectionner un rôle");
      return;
    }

    const selectedDemUser = DEMO_USERS.find(u => u.id === selectedRole);
    if (selectedDemUser) {
      setCurrentUser(selectedDemUser);
      setSelectedRole("");
    } else {
      const defaultUser: User = { id: "u-custom", name: selectedRole, role: "treasurer" };
      setCurrentUser(defaultUser);
      setSelectedRole("");
    }
  };

  const handleAddScout = async (name: string, regNo: string, amountPaid: number) => {
    const scoutId = `s-${Date.now()}`;
    const newScout: Scout = {
      id: scoutId,
      name,
      regNo,
      amountPaid,
      dateAdded: new Date().toISOString()
    };
    await upsertScout(scoutId, newScout);

    if (amountPaid > 0) {
      const parentIncome: Income = {
        id: `inc-sc-${Date.now()}`,
        date: new Date().toISOString(),
        type: "participation",
        amount: amountPaid,
        payerName: `اشتراك الكشاف: ${name}`,
        method: "cash",
        receiptNo: `REC-AUTO-${Math.floor(Math.random() * 9000 + 1000)}`,
        registeredBy: currentUser?.name || "أمين المال",
        scoutId,
        note: `معلوم قسط تسجيل مشاركة الكشاف ${name} بالدفتر`
      };
      await upsertIncome(parentIncome.id, parentIncome);
      setSelectedReceiptIncome(parentIncome);
    }
  };

  const handleBulkLoadScouts = async (scoutList: { name: string; regNo: string; amountPaid: number }[]) => {
    for (let idx = 0; idx < scoutList.length; idx++) {
      const s = scoutList[idx];
      const scoutId = `s-bulk-${idx}-${Date.now()}`;
      const scout: Scout = {
        id: scoutId,
        name: s.name,
        regNo: s.regNo,
        amountPaid: s.amountPaid,
        dateAdded: new Date().toISOString()
      };
      await upsertScout(scoutId, scout);

      if (s.amountPaid > 0) {
        const tr: Income = {
          id: `inc-bulk-${idx}-${Date.now()}`,
          date: new Date().toISOString(),
          type: "participation",
          amount: s.amountPaid,
          payerName: `دفع الكشاف: ${s.name}`,
          method: "cash",
          receiptNo: `REC-AUTO-${Math.floor(Math.random() * 90000 + 10000)}`,
          registeredBy: currentUser?.name || "النظام المستورد التلقائي",
          scoutId,
          note: `رسوم مضافة فورياً من معالج الاستيراد التلقائي`
        };
        await upsertIncome(tr.id, tr);
      }
    }
  };

  const handleRecordScoutPayment = async (
    scoutId: string,
    amount: number,
    method: "cash" | "cheque" | "transfer",
    note?: string
  ) => {
    const targetScout = scouts.find(s => s.id === scoutId);
    if (targetScout) {
      await updateScout(scoutId, { amountPaid: targetScout.amountPaid + amount });
    }

    const newInc: Income = {
      id: `inc-p-${Date.now()}`,
      date: new Date().toISOString(),
      type: "participation",
      amount,
      payerName: `اشتراك تكميلي: ${targetScout?.name || "كشاف"}`,
      method,
      receiptNo: `REC-ADD-${Math.floor(Math.random() * 90000 + 10000)}`,
      registeredBy: currentUser?.name || "أمين المال",
      scoutId,
      note: note || `قسط تكميلي مسدد لمعلوم المخيم`
    };
    await upsertIncome(newInc.id, newInc);
    setSelectedReceiptIncome(newInc);
  };

  const handleAddExpenseManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount <= 0 || !expSupplier.trim()) return;

    const requiresApproval = expAmount > (campSetup?.spendingLimitWithoutApproval ?? 100);
    const isApprovalAuto = !requiresApproval || currentUser?.role === "treasurer";
    const finalInvoiceStatus = expInvoiceImage ? "existing" : expInvoiceStatus;

    const expId = `exp-man-${Date.now()}`;
    const existingSetup = campSetup || EMPTY_CAMP_SETUP;
    const newExp: Partial<Expense> = {
      id: expId,
      invoiceCode: expInvoiceCode || `F-26-${String(expenses.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString(),
      category: expCategory,
      description: expDesc || `قضاء مقتنيات بند ${expCategory}`,
      amount: expAmount,
      qty: expQty,
      unitPrice: expPrice || expAmount,
      supplier: expSupplier,
      paidBy: expPaidBy || currentUser?.name || "أمين صندوق الفوج",
      authorizedBy: requiresApproval ? (isApprovalAuto ? (currentUser?.name || "أمين صندوق الفوج") : "معلق ترخيص بموافقة القائد") : "تلقائي القيود",
      invoiceStatus: finalInvoiceStatus,
      ...(expInvoiceImage ? { invoiceImage: expInvoiceImage } : {}),
      status: isApprovalAuto ? "approved" : "pending_approval",
      note: expNote,
      registeredBy: currentUser?.name || "أمين صندوق الفوج"
    };

    await upsertExpense(expId, newExp as Expense);
    setShowExpenseModal(false);

    setExpDesc("");
    setExpAmount(0);
    setExpSupplier("");
    setExpNote("");
    setExpInvoiceImage(null);
    setExpInvoiceCode("");
  };

  const handleAddIncomeManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incAmount <= 0 || !incPayer.trim()) return;

    const selectedReasonObj = INCOME_REASONS.find(r => r.code === incReasonCode);
    const reasonText = selectedReasonObj ? (locale === "ar" ? selectedReasonObj.labelAr : selectedReasonObj.labelFr) : incNote;

    const incId = `inc-man-${Date.now()}`;
    const newInc: Income = {
      id: incId,
      date: new Date().toISOString(),
      type: incType,
      amount: incAmount,
      payerName: incPayer,
      method: incMethod,
      receiptNo: `REC-MAN-${Math.floor(Math.random() * 90000 + 10000)}`,
      registeredBy: currentUser?.name || "أمين المال",
      note: incNote || reasonText,
      receivedByLeader: incReceivedBy || currentUser?.name || "أمين صندوق الفوج",
      ...(incPayerPhone ? { payerPhone: incPayerPhone } : {}),
      incomeReason: reasonText
    };

    if (incReasonCode === "camp_participation") {
      const trimmedName = incPayer.trim();
      const existingScout = scouts.find(s => 
        (incSelectedScoutId && incSelectedScoutId !== "new" && s.id === incSelectedScoutId) || 
        s.name.trim() === trimmedName
      );

      if (existingScout) {
        newInc.scoutId = existingScout.id;
        await updateScout(existingScout.id, { amountPaid: existingScout.amountPaid + incAmount });
      } else {
        const newScoutId = `s-${Date.now()}`;
        const newScout: Scout = {
          id: newScoutId,
          name: trimmedName,
          regNo: `K-${Math.floor(Math.random() * 900 + 100)}/26`,
          amountPaid: incAmount,
          dateAdded: new Date().toISOString()
        };
        await upsertScout(newScoutId, newScout);
        newInc.scoutId = newScoutId;
      }
    }

    await upsertIncome(incId, newInc);
    setShowIncomeModal(false);
    setSelectedReceiptIncome(newInc);
    autoSendReceipt(newInc);

    setIncPayer("");
    setIncAmount(0);
    setIncNote("");
    setIncReceivedBy("");
    setIncReasonCode("camp_participation");
    setIncPayerPhone("");
    setIncSelectedScoutId("");
  };

  const handleCancelExpense = async (id: string, reason: string) => {
    await updateExpense(id, { isCancelled: true, cancelReason: reason } as Partial<Expense>);
  };

  const handleCancelIncome = async (id: string, reason: string) => {
    await updateIncome(id, { isCancelled: true, cancelReason: reason } as Partial<Income>);
  };

  const handleApproveExpense = async (id: string) => {
    await updateExpense(id, { status: "approved", authorizedBy: currentUser?.name || "القائد طارق" } as Partial<Expense>);
  };

  const handleUploadInvoice = async (expenseId: string, base64: string) => {
    await updateExpense(expenseId, { invoiceImage: base64, invoiceStatus: "existing" } as Partial<Expense>);
  };

  const handleOcrSuccess = async (data: {
    supplier: string;
    amount: number;
    category: ExpenseCategoryCode;
    description: string;
    date: string;
    invoiceImage: string;
  }) => {
    const requiresApproval = data.amount > (campSetup?.spendingLimitWithoutApproval ?? 100);
    const isApprovalAuto = !requiresApproval || currentUser?.role === "treasurer";

    let nextNum = 1;
    expenses.forEach(e => {
      if (e.invoiceCode && e.invoiceCode.startsWith("F-26-")) {
        const numPart = e.invoiceCode.substring(5);
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed >= nextNum) {
          nextNum = parsed + 1;
        }
      }
    });
    const autoCode = `F-26-${String(nextNum).padStart(3, "0")}`;

    const expId = `exp-ocr-${Date.now()}`;
    const newExp: Expense = {
      id: expId,
      invoiceCode: autoCode,
      date: data.date,
      category: data.category,
      description: data.description,
      amount: data.amount,
      supplier: data.supplier,
      paidBy: currentUser?.name || "أمين المال - مستخرج آلي",
      authorizedBy: isApprovalAuto ? (currentUser?.name || "مسجل تلقائيا بـ AI") : "مرخص آلي",
      invoiceImage: data.invoiceImage,
      invoiceStatus: "existing",
      status: isApprovalAuto ? "approved" : "pending_approval",
      registeredBy: `${currentUser?.name || "مستخرج آلي"} (معالج الـ OCR)`
    };

    await upsertExpense(expId, newExp);
    setActiveTab("transactions");
  };

  const handleVoiceCommandParsed = async (parsed: {
    type: "expense" | "income";
    category: ExpenseCategoryCode;
    incomeType?: string;
    amount: number;
    label: string;
    note?: string;
  }) => {
    if (parsed.type === "expense") {
      const requiresApproval = parsed.amount > (campSetup?.spendingLimitWithoutApproval ?? 100);
      const isApprovalAuto = !requiresApproval || currentUser?.role === "treasurer";

      let nextNum = 1;
      expenses.forEach(e => {
        if (e.invoiceCode && e.invoiceCode.startsWith("F-26-")) {
          const numPart = e.invoiceCode.substring(5);
          const p = parseInt(numPart, 10);
          if (!isNaN(p) && p >= nextNum) {
            nextNum = p + 1;
          }
        }
      });
      const autoCode = `F-26-${String(nextNum).padStart(3, "0")}`;

      const expId = `exp-voice-${Date.now()}`;
      const newExp: Expense = {
        id: expId,
        invoiceCode: autoCode,
        date: new Date().toISOString(),
        category: parsed.category || "misc",
        description: parsed.label,
        amount: parsed.amount,
        supplier: "مزود عام تونس",
        paidBy: currentUser?.name || "محلل الأوامر الصوتية",
        authorizedBy: isApprovalAuto ? (currentUser?.name || "أمين المال") : "انتظار قائد النشاط",
        invoiceStatus: "missing",
        status: isApprovalAuto ? "approved" : "pending_approval",
        note: parsed.note || "أمر صوتي",
        registeredBy: currentUser?.name || "المحلل الصوتي"
      };
      await upsertExpense(expId, newExp);
    } else {
      const incId = `inc-voice-${Date.now()}`;
      const newInc: Income = {
        id: incId,
        date: new Date().toISOString(),
        type: (parsed.incomeType as any) || "donation",
        amount: parsed.amount,
        payerName: parsed.label,
        method: "cash",
        receiptNo: `REC-VOX-${Math.floor(Math.random()*9000 + 1000)}`,
        registeredBy: currentUser?.name || "محلل صوتي",
        note: parsed.note || "تم التسجيل عن طريق الصوت"
      };
      await upsertIncome(incId, newInc);
    }
    setActiveTab("transactions");
  };

  const autoSendReceipt = async (income: Income) => {
    if (!income.payerPhone) return;
    setSendingStatus(locale === "ar" ? "جاري إرسال الوصل عبر واتساب..." : "Envoi du reçu par WhatsApp...");
    try {
      const response = await fetch("/api/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incomeId: income.id, phone: income.payerPhone }),
      });
      const result = await response.json();
      if (result.success) {
        setSendingStatus(locale === "ar" ? "✅ تم إرسال الوصل بنجاح" : "✅ Reçu envoyé avec succès");
      } else {
        setSendingStatus(locale === "ar" ? `⚠️ ${result.message}` : `⚠️ ${result.message}`);
      }
    } catch {
      setSendingStatus(locale === "ar" ? "❌ فشل إرسال الوصل" : "❌ Échec d'envoi du reçu");
    }
    setTimeout(() => setSendingStatus(null), 4000);
  };

  const handleResetDatabases = async () => {
    await saveCampSetup(DEFAULT_CAMP_SETUP);
    await saveCategories(CATEGORIES_LIST);
    await setTroopStamp(null);
    await setLeaderSignature(null);
    await setTreasurerSignature(null);
    alert(locale === "ar" ? "تم بنجاح تحميل البيانات التجريبية الشاملة!" : "Données de démonstration chargées avec succès !");
  };

  const handleClearAllData = async () => {
    await saveCampSetup(EMPTY_CAMP_SETUP);
    await saveCategories(CATEGORIES_LIST);
    await setTroopStamp(null);
    await setLeaderSignature(null);
    await setTreasurerSignature(null);
    alert(locale === "ar" ? "تم حذف قاعدة البيانات بالكامل وتصفير كل السجلات الكشفية بنجاح!" : "Base de données supprimée et vidée avec succès !");
  };

  const effectiveCampSetup = campSetup || EMPTY_CAMP_SETUP;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-amber-50 dark:bg-zinc-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors select-none font-sans" dir="rtl">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-emerald-900 border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-500 shadow-xl">
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div className="space-y-1 block">
            <h2 className="text-2.5xl font-black text-emerald-900 dark:text-emerald-450 tracking-tight">كراس المالية الرقمي الكشفي</h2>
            <p className="text-xs text-zinc-500 font-medium">{locale === "ar" ? "المنصة المالية والذكية المتكاملة للفوج والمخيم الكشفي" : "Plateforme d'intendance financière intelligente pour les camps scouts"}</p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow-xl rounded-3xl sm:px-10 border border-amber-100 dark:border-zinc-800 space-y-6">
            
            <div className="bg-amber-55 border border-amber-200 p-4 rounded-xl text-xs space-y-2 block">
              <p className="font-bold text-amber-900 text-center">🔐 حدد الحساب للدخول :</p>
              <p className="font-semibold text-zinc-700 text-right text-3xs">{locale === "ar" ? "اختر الدور المناسب للدخول إلى دفتر المالية" : "Choisissez votre rôle pour accéder au registre"}</p>
            </div>

            <form className="space-y-4 text-xs font-semibold" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-zinc-650 dark:text-zinc-300 mb-1.5">{locale === "ar" ? "اختر الحساب القيادي المعني" : "Rôle / Compte d'accès"}</label>
                <select 
                  className="w-full px-3 py-2 border dark:border-zinc-805 rounded-xl bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-200 focus:outline-emerald-800"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  <option value="">-- اختر الحساب الكشفي المعين --</option>
                  {DEMO_USERS.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {loginError && (
                <div className="bg-rose-50 text-rose-800 p-3 rounded-lg text-3xs font-medium text-center">
                  {loginError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-emerald-900 hover:bg-emerald-800 text-amber-50 font-black py-2.5 rounded-xl text-center transition shadow-lg outline-none"
              >
                {locale === "ar" ? "دخول إلى دفتر المالية الكشفي" : "Accéder au registre"}
              </button>
            </form>

            <div className="text-center pt-2 border-t dark:border-zinc-800 flex justify-between text-2xs font-extrabold text-zinc-400">
              <button onClick={() => setLocale(locale === "ar" ? "fr" : "ar")} className="hover:text-emerald-805 flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "Français" : "العربية"}</span>
              </button>
              <span>{locale === "ar" ? "الكشافة التونسية 🏕️" : "Scouts Tunisiens 🏕️"}</span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col transition-colors font-sans" dir={locale === "ar" ? "rtl" : "ltr"}>
      
      <header className="bg-emerald-900 text-amber-50 px-4 sm:px-6 py-4 shadow-md shrink-0 border-b border-emerald-950 select-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950 border border-amber-400 rounded-full text-amber-500">
              <Compass className="w-5 h-5" />
            </div>
            <div className="block text-right">
              <h1 className="font-extrabold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1 flex-wrap">
                <span>{effectiveCampSetup.campName}</span>
                <span className="bg-amber-500 text-amber-950 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full">
                  Fouj 2026/25
                </span>
              </h1>
              <p className="text-3xs text-emerald-250 font-bold block">
                {locale === "ar" ? `كراس المالية الرقمي لـ ${effectiveCampSetup.campName || "للفوج الكشفي"}` : `Registre de Trésorerie - ${effectiveCampSetup.campName || "Scout"}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-emerald-850 rounded-lg text-emerald-200 transition"
              title="تغيير المظهر"
            >
              {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button 
              onClick={() => setLocale(locale === "ar" ? "fr" : "ar")}
              className="p-2 hover:bg-emerald-850 rounded-lg text-emerald-200 transition flex items-center gap-1 font-bold text-3xs font-mono"
              title="تغيير اللغة"
            >
              <Languages className="w-4.5 h-4.5" />
              <span>{locale === "ar" ? "FR" : "AR"}</span>
            </button>

            <div className="hidden md:flex items-center gap-2 bg-emerald-950/70 py-1.5 px-3 rounded-lg border border-emerald-800 text-xs font-semibold select-none text-right">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-white text-[11px] leading-tight truncate">{currentUser.name}</p>
                <p className="text-[9px] text-emerald-355 font-bold block">{currentUser.role === "treasurer" ? "أمين مال" : "قائد النشاط"}</p>
              </div>
            </div>

            <button 
              onClick={() => setCurrentUser(null)}
              className="p-2 hover:bg-rose-900 rounded-lg text-rose-300 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>

          </div>

        </div>
      </header>

      <nav className="bg-white dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 py-1.5 px-4 overflow-x-auto select-none font-bold shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2">
          
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "dashboard" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{locale === "ar" ? "لوحة التوجيه" : "Aperçu"}</span>
          </button>

          <button 
            onClick={() => setActiveTab("transactions")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "transactions" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{locale === "ar" ? "الدفتر المالي" : "Grand livre"}</span>
          </button>

          <button 
            onClick={() => setActiveTab("scouts")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "scouts" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <Coins className="w-4 h-4" />
            <span>{locale === "ar" ? "دفع الكشافة" : "Scouts & Cotis."}</span>
          </button>

          <button 
            onClick={() => setActiveTab("budget")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "budget" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <Landmark className="w-4 h-4" />
            <span>{locale === "ar" ? "ميزانية البنود" : "Analytique"}</span>
          </button>

          <button 
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "reports" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{locale === "ar" ? "التقارير والتصدير" : "Rapports & Exp."}</span>
          </button>

          <button 
            onClick={() => setActiveTab("settings")}
            className={`px-3 py-2 rounded-xl text-3xs flex items-center gap-1.5 transition whitespace-nowrap ${activeTab === "settings" ? "bg-emerald-900 text-white shadow" : "text-zinc-600 dark:text-zinc-300 hover:bg-stone-100"}`}
          >
            <Sliders className="w-4 h-4" />
            <span>{locale === "ar" ? "إعداد الميزانيات" : "Configuration"}</span>
          </button>

        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 overflow-y-auto">
        
        {activeTab === "dashboard" && (
          <DashboardOverview 
            expenses={expenses}
            incomes={incomes}
            scouts={scouts}
            campSetup={effectiveCampSetup}
            locale={locale}
            setActiveTab={setActiveTab}
            onQuickIncome={() => setShowIncomeModal(true)}
            onQuickExpense={() => setShowExpenseModal(true)}
            categories={categories}
          />
        )}

        {activeTab === "transactions" && (
          <TransactionsList 
            expenses={expenses}
            incomes={incomes}
            currentUser={currentUser}
            locale={locale}
            onCancelExpense={handleCancelExpense}
            onCancelIncome={handleCancelIncome}
            onApproveExpense={handleApproveExpense}
            categories={categories}
            onViewReceipt={setSelectedReceiptIncome}
            onUploadInvoice={handleUploadInvoice}
          />
        )}

        {activeTab === "scouts" && (
          <ScoutManager 
            scouts={scouts}
            campSetup={effectiveCampSetup}
            currentUser={currentUser}
            locale={locale}
            onAddScout={handleAddScout}
            onRecordPayment={handleRecordScoutPayment}
            onBulkLoadScouts={handleBulkLoadScouts}
            incomes={incomes}
            onViewReceipt={setSelectedReceiptIncome}
          />
        )}

        {activeTab === "budget" && (
          <BudgetComparison 
            expenses={expenses}
            campSetup={effectiveCampSetup}
            locale={locale}
            categories={categories}
          />
        )}

        {activeTab === "reports" && (
          <ReportExports 
            expenses={expenses}
            incomes={incomes}
            scouts={scouts}
            campSetup={effectiveCampSetup}
            locale={locale}
            categories={categories}
            leaderSignature={leaderSignature}
            treasurerSignature={treasurerSignature}
          />
        )}

        {activeTab === "settings" && (
          <CampSettings 
            campSetup={effectiveCampSetup}
            currentUser={currentUser}
            locale={locale}
            onUpdateSetup={saveCampSetup}
            onSwitchUser={(uid) => {
              const matched = DEMO_USERS.find(du => du.id === uid);
              if (matched) setCurrentUser(matched);
            }}
            onResetAllData={handleClearAllData}
            onLoadDemoData={handleResetDatabases}
            categories={categories}
            onUpdateCategories={saveCategories}
            troopStamp={troopStamp}
            onUpdateStamp={setTroopStamp}
            leaderSignature={leaderSignature}
            onUpdateLeaderSignature={setLeaderSignature}
            treasurerSignature={treasurerSignature}
            onUpdateTreasurerSignature={setTreasurerSignature}
          />
        )}

      </main>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 text-right">
          <div className="bg-white dark:bg-zinc-900 border text-stone-850 dark:text-zinc-150 p-6 rounded-2xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <button onClick={() => setShowExpenseModal(false)} className="text-zinc-400 hover:text-rose-700">✕</button>
              <h3 className="font-extrabold text-sm">{locale === "ar" ? "تسجيل مخرج وصرف فوري بالفاتورة" : "Acheminer une dépense"}</h3>
            </div>

            <form onSubmit={handleAddExpenseManual} className="space-y-3.5 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "تبويب بند الصرف" : "Rubrique"}</label>
                  <select 
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                  >
                    {categories.map((c) => (
                      <option key={c.code} value={c.code}>{locale === "ar" ? c.labelAr : c.labelFr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "المبلغ الجملي بالدينار" : "Montant (TND)"}</label>
                  <input 
                    type="number"
                    step="0.005"
                    min="0"
                    required
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800"
                    value={expAmount || ""}
                    onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs mb-1 text-emerald-800 dark:text-emerald-400 font-black">
                    {locale === "ar" ? "⚜️ رمز الفاتورة الفريد (يكتب ورقياً)" : "Code facture unique (à écrire)"}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: F-26-008"
                    className="w-full px-2.5 py-1.5 border rounded bg-amber-50/55 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 font-bold text-center text-zinc-800 dark:text-amber-200"
                    value={expInvoiceCode}
                    onChange={(e) => setExpInvoiceCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "اسم المورد / المتجر الفاتح" : "Magasin / Fournisseur"}</label>
                  <input 
                    type="text"
                    required
                    placeholder=""
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50 dark:bg-zinc-955 dark:border-zinc-800 placeholder-zinc-400"
                    value={expSupplier}
                    onChange={(e) => setExpSupplier(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "شرح وتوصيف المشتريات بدقة" : "Description détaillée"}</label>
                <textarea 
                  className="w-full h-16 p-2 border rounded bg-zinc-55 dark:bg-zinc-950 dark:border-zinc-800"
                  placeholder=""
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-right font-medium text-xs">
                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "حالة الفاتورة المرفقة" : "Justificatif"}</label>
                  <select 
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    value={expInvoiceImage ? "existing" : expInvoiceStatus}
                    onChange={(e) => setExpInvoiceStatus(e.target.value as any)}
                    disabled={!!expInvoiceImage}
                  >
                    <option value="existing">{locale === "ar" ? "فاتورة موجودة ✓" : "Présente"}</option>
                    <option value="missing">{locale === "ar" ? "مفقودة ⚠️" : "Manquante"}</option>
                    <option value="way">{locale === "ar" ? "في الطريق للمراجعة" : "En cours"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "من أذن الصرف بالاسم" : "Payé par"}</label>
                  <input 
                    type="text"
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    placeholder=""
                    value={expPaidBy}
                    onChange={(e) => setExpPaidBy(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-150 dark:border-zinc-800 space-y-2 text-right">
                <label className="block text-3xs font-black text-zinc-550 uppercase">{locale === "ar" ? "📷 تصوير أو تحميل الفاتورة الإثباتية" : "📷 Prendre une photo de la facture"}</label>
                
                {expInvoiceImage ? (
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border">
                    <img src={expInvoiceImage} alt="Invoice preview" className="w-12 h-12 object-cover rounded-md shadow-xs" />
                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <p className="text-3xs text-emerald-700 font-bold">{locale === "ar" ? "تم التقاط الفاتورة بنجاح ✓" : "Facture capturée ✓"}</p>
                      <p className="text-[9px] text-zinc-400 font-mono truncate">Base64 Encoded Image</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setExpInvoiceImage(null)}
                      className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-transparent px-2 py-1 rounded text-3xs font-bold leading-tight cursor-pointer shrink-0"
                    >
                      {locale === "ar" ? "إلغاء ✕" : "Retirer"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      id="expense-invoice-image-picker"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setExpInvoiceImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("expense-invoice-image-picker")?.click()}
                      className="w-full py-2 bg-emerald-950/5 hover:bg-emerald-950/10 text-emerald-900 dark:text-emerald-300 border border-dashed border-emerald-800/40 font-extrabold text-2xs rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span>📷 {locale === "ar" ? "اضغط هنا لتصوير الفاتورة الرسمية بهاتفك" : "Prendre en photo la facture"}</span>
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl transition cursor-pointer"
              >
                {locale === "ar" ? "تسجيل مخرج الصرف في كشف الحساب" : "Enregistrer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 text-right">
          <div className="bg-white dark:bg-zinc-900 border text-stone-850 p-6 rounded-2xl w-full max-w-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <button onClick={() => setShowIncomeModal(false)} className="text-zinc-400 hover:text-rose-700 font-bold">✕</button>
              <h3 className="font-extrabold text-sm">{locale === "ar" ? "تسجيل مدخول نقدي مباشر بالصندق" : "Enregistrer Recette"}</h3>
            </div>

            <form onSubmit={handleAddIncomeManual} className="space-y-3.5 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "تصنيف المدخول المعزز" : "Type de recette"}</label>
                  <select 
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    value={incType}
                    onChange={(e) => setIncType(e.target.value as any)}
                  >
                    <option value="participation">{locale === "ar" ? "معلوم مشاركة 🧍" : "Particpation"}</option>
                    <option value="grant">{locale === "ar" ? "منح دعم 📑" : "Subvention"}</option>
                    <option value="donation">{locale === "ar" ? "تبرع أفراد كرام 🤝" : "Donation"}</option>
                    <option value="activity">{locale === "ar" ? "عائدات أنشطة ونمو 🥯" : "Activités"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "المبلغ بالدينار" : "Montant (TND)"}</label>
                  <input 
                    type="number"
                    step="0.005"
                    min="0"
                    required
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    value={incAmount || ""}
                    onChange={(e) => setIncAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {incReasonCode === "camp_participation" && (
                <div>
                  <label className="block text-3xs text-emerald-800 dark:text-emerald-400 mb-1 font-bold">
                    {locale === "ar" ? "ربط بالاسم الكشفي المشارك 🎒" : "Associer au Scout"}
                  </label>
                  <select
                    className="w-full px-2.5 py-1.5 border border-emerald-300 dark:border-emerald-850 rounded bg-emerald-50/50 text-xs font-bold text-emerald-950 dark:text-emerald-200"
                    value={incSelectedScoutId}
                    onChange={(e) => {
                      const sid = e.target.value;
                      setIncSelectedScoutId(sid);
                      const found = scouts.find(s => s.id === sid);
                      if (found) {
                        setIncPayer(found.name);
                      } else {
                        setIncPayer("");
                      }
                    }}
                  >
                    <option value="">{locale === "ar" ? "-- اختر كشافاً مسجلاً --" : "-- Choisir un scout --"}</option>
                    <option value="new" className="text-emerald-700 font-bold">{locale === "ar" ? "➕ كشاف جديد غير مسجل بقائمة المشاركين" : "➕ Nouveau scout"}</option>
                    {scouts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.regNo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-3xs text-zinc-450 mb-1">{locale === "ar" ? "المصدر والجهة الدافعة" : "Donateur / Payeur"}</label>
                <input 
                  type="text"
                  required
                  placeholder=""
                  className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                  value={incPayer}
                  onChange={(e) => setIncPayer(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs text-zinc-455 mb-1">{locale === "ar" ? "طريقة استلام المبلغ" : "Mode de réception"}</label>
                  <select 
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    value={incMethod}
                    onChange={(e) => setIncMethod(e.target.value as any)}
                  >
                    <option value="cash">{locale === "ar" ? "نقداً 💵" : "Espèces"}</option>
                    <option value="cheque">{locale === "ar" ? "شيك 🧾" : "Chèque"}</option>
                    <option value="transfer">{locale === "ar" ? "تحويل بنكي 🏦" : "Virement"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-3xs text-zinc-455 mb-1">{locale === "ar" ? "السبب المباشر (جاهز)" : "Motif (Préfabriqué)"}</label>
                  <select 
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50 font-bold text-[11px] text-emerald-800"
                    value={incReasonCode}
                    onChange={(e) => setIncReasonCode(e.target.value)}
                  >
                    {INCOME_REASONS.map(r => (
                      <option key={r.code} value={r.code}>
                        {locale === "ar" ? r.labelAr : r.labelFr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-3xs text-zinc-455 mb-1">{locale === "ar" ? "اسم القائد الذي تسلم المبلغ" : "Nom du Leader récepteur"}</label>
                  <input 
                    type="text"
                    required
                    placeholder={currentUser?.name || "أمين المال"}
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                    value={incReceivedBy}
                    onChange={(e) => setIncReceivedBy(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-3xs text-zinc-455 mb-1">{locale === "ar" ? "رقم هاتف الولي (واتساب)" : "Tél parent (WhatsApp)"}</label>
                  <input 
                    type="text"
                    placeholder=""
                    className="w-full px-2.5 py-1.5 border rounded bg-zinc-55 font-mono"
                    value={incPayerPhone}
                    onChange={(e) => setIncPayerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs text-zinc-500 mb-1">{locale === "ar" ? "شرح مخصص أو ملاحظة إضافية" : "Remarques spéciales"}</label>
                <input 
                  type="text"
                  placeholder=""
                  className="w-full px-2.5 py-1.5 border rounded bg-zinc-50"
                  value={incNote}
                  onChange={(e) => setIncNote(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl transition cursor-pointer"
              >
                {locale === "ar" ? "قبض وإيداع المدخول وتوليد الوصل 📄" : "Valider & Imprimer Reçu"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedReceiptIncome && (
        <ReceiptModal
          income={selectedReceiptIncome}
          locale={locale}
          troopStamp={troopStamp}
          onUploadStamp={setTroopStamp}
          troopSignature={treasurerSignature}
          troopName={effectiveCampSetup.troopName}
          onClose={() => setSelectedReceiptIncome(null)}
        />
      )}

      {/* Auto-send WhatsApp notification toast */}
      {sendingStatus && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700 text-xs font-bold animate-in slide-in-from-bottom-4 fade-in duration-200 flex items-center gap-2.5">
          <span>{sendingStatus.includes("✅") ? "✅" : sendingStatus.includes("❌") ? "❌" : "⏳"}</span>
          <span>{sendingStatus}</span>
        </div>
      )}

      <footer className="bg-stone-100 dark:bg-zinc-900 border-t border-stone-200 dark:border-zinc-805 py-4 px-4 text-center text-3xs text-zinc-450/90 font-bold tracking-wider shrink-0 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>{effectiveCampSetup.campName || "فوج الكشافة"} - الكشافة التونسية © 2026/2025</span>
          <span className="font-mono">مطور بكفاءة للعمل الأوفلاين 🏕️ Offline Compliant</span>
        </div>
      </footer>

    </div>
  );
}
