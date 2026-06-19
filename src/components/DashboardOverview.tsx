import React from "react";
import { Expense, Income, Scout, CampSetup, ExpenseCategoryCode } from "../types";
import { formatTND, formatDate } from "../utils/helpers";
import { CATEGORIES_LIST } from "../initialData";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area 
} from "recharts";
import { 
  DollarSign, TrendingDown, TrendingUp, Users, AlertCircle, CheckCircle2, FileText, PlusCircle, Compass 
} from "lucide-react";

interface DashboardOverviewProps {
  expenses: Expense[];
  incomes: Income[];
  scouts: Scout[];
  campSetup: CampSetup;
  locale: "ar" | "fr";
  setActiveTab: (tab: string) => void;
  onQuickIncome: () => void;
  onQuickExpense: () => void;
  onLoadDemoData?: () => void;
  categories?: { code: string; labelAr: string; labelFr: string; emoji: string }[];
}

export default function DashboardOverview({
  expenses,
  incomes,
  scouts,
  campSetup,
  locale,
  setActiveTab,
  onQuickIncome,
  onQuickExpense,
  onLoadDemoData,
  categories = CATEGORIES_LIST
}: DashboardOverviewProps) {
  
  // Exclude cancelled items in totals
  const activeExpenses = expenses.filter(e => !e.isCancelled);
  const activeIncomes = incomes.filter(i => !i.isCancelled);

  // Total Income
  const totalIncome = activeIncomes.reduce((acc, curr) => acc + curr.amount, 0);

  // Total Expense
  const totalExpense = activeExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Balance
  const currentBalance = totalIncome - totalExpense;

  // Scout payment counters
  const totalScoutsCount = scouts.length || campSetup.scoutCount;
  const scoutsPaidFully = scouts.filter(s => s.amountPaid >= campSetup.scoutFee).length;
  const scoutsPaidPartially = scouts.filter(s => s.amountPaid > 0 && s.amountPaid < campSetup.scoutFee).length;
  const scoutsUnpaid = scouts.filter(s => s.amountPaid === 0).length;

  // Budget executions per category
  const categoryStats = categories.map(cat => {
    const planned = campSetup.plannedBudgets[cat.code] || 0;
    const spentObj = activeExpenses.filter(e => e.category === cat.code && e.status === "approved");
    const spent = spentObj.reduce((acc, curr) => acc + curr.amount, 0);
    const percentage = planned > 0 ? (spent / planned) * 100 : 0;
    return {
      ...cat,
      planned,
      spent,
      percentage
    };
  });

  // Latest 5 operations combined
  const combinedOperations = [
    ...activeIncomes.map(i => ({ ...i, opType: "income" as const })),
    ...activeExpenses.map(e => ({ ...e, opType: "expense" as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Chart 1: Category Expenses Pie Chart Data
  const pieData = categoryStats
    .filter(c => c.spent > 0)
    .map(c => ({
      name: locale === "ar" ? c.labelAr : c.labelFr,
      value: c.spent,
      code: c.code
    }));

  const COLORS = [
    "#065f46", // emerald-800
    "#d97706", // amber-600
    "#4338ca", // indigo-700
    "#be123c", // rose-700
    "#0369a1", // sky-700
    "#15803d", // green-700
    "#e11d48", // rose-600
    "#6b7280"  // gray-500
  ];

  // Chart 2: Planned vs Actual Budgets Bar Chart Data
  const barData = categoryStats.map(c => ({
    name: locale === "ar" ? c.labelAr.split(" ")[0] : c.labelFr.split(" ")[0],
    التقديرية: c.planned,
    المنفقة: c.spent
  }));

  // Chart 3: Daily cumulative balance estimation
  // We'll map transactions to day indexes of the camp and aggregate
  const getDailyBalanceData = () => {
    const days: Record<string, { income: number; expense: number }> = {};
    
    // Fill in dates
    const start = new Date(campSetup.startDate);
    const end = new Date(campSetup.endDate);
    const dateList: string[] = [];
    const currentIter = new Date(start);
    while (currentIter <= end) {
      const dateStr = currentIter.toISOString().split("T")[0];
      dateList.push(dateStr);
      days[dateStr] = { income: 0, expense: 0 };
      currentIter.setDate(currentIter.getDate() + 1);
    }

    // Accumulate actual incomes and expenses
    activeIncomes.forEach(i => {
      const dateStr = i.date.split("T")[0];
      if (days[dateStr]) days[dateStr].income += i.amount;
    });

    activeExpenses.forEach(e => {
      const dateStr = e.date.split("T")[0];
      if (days[dateStr]) days[dateStr].expense += e.amount;
    });

    let runningBalance = 0;
    return dateList.map((d, index) => {
      runningBalance += (days[d].income - days[d].expense);
      return {
        day: `${locale === "ar" ? "يوم" : "Jour"} ${index + 1}`,
        date: d,
        الرصيد: runningBalance
      };
    });
  };

  const dailyBalanceData = getDailyBalanceData();

  // Alerts calculations (to display localized highlights)
  const systemAlerts: { type: "danger" | "warning" | "success" | "info"; msg: string }[] = [];
  
  const hasAnyData = scouts.length > 0 || activeExpenses.length > 0 || activeIncomes.length > 0;

  if (hasAnyData) {
    // 1. Threshold alert
    categoryStats.forEach(stat => {
      if (stat.percentage >= 100) {
        systemAlerts.push({
          type: "danger",
          msg: locale === "ar" 
            ? `تنبيه حرج 🔴: لقد تجاوزت الميزانية المحددة لبند ${stat.labelAr} بنسبة ${stat.percentage.toFixed(0)}%!`
            : `Alerte Rouge 🔴: Le budget du poste '${stat.labelFr}' est dépassé à ${stat.percentage.toFixed(0)}% !`
        });
      } else if (stat.percentage >= 80) {
        systemAlerts.push({
          type: "warning",
          msg: locale === "ar"
            ? `تنبيه برتقالي 🟠: لقد بلغت نسبة صرف ${stat.percentage.toFixed(0)}% من ميزانية بند ${stat.labelAr}.`
            : `Alerte Orange 🟠: ${stat.percentage.toFixed(0)}% du budget consommé pour '${stat.labelFr}'.`
        });
      }
    });

    // 2. Budget balance warning
    if (currentBalance < 200) {
      systemAlerts.push({
        type: "danger",
        msg: locale === "ar"
          ? `تنبيه الصندوق 🛑: انخفض الرصيد النقدي المتوفر إلى أقل من 200 دينار (${formatTND(currentBalance)})!`
          : `Alerte Caisse 🛑: Le solde cash est tombé sous 200 TND (${formatTND(currentBalance, "fr")}) !`
      });
    }

    // 3. Unpaid scouts warning
    if (scoutsUnpaid > 0) {
      systemAlerts.push({
        type: "warning",
        msg: locale === "ar"
          ? `تنبيه التمويل 🟡: هناك عدد ${scoutsUnpaid} مشاركين لم يسددوا معلوم الاشتراك الكشفي حتى الآن.`
          : `Alerte Participation 🟡: ${scoutsUnpaid} scouts n'ont pas encore payé leurs frais.`
      });
    }

    // 4. Missing invoices
    const missingInvsCount = activeExpenses.filter(e => !e.invoiceImage).length;
    if (missingInvsCount > 0) {
      systemAlerts.push({
        type: "danger",
        msg: locale === "ar"
          ? `⚠️ تنبيه الحسابات والشفافية: تم تسجيل عدد ${missingInvsCount} حركات صرف بدون تصوير الفاتورة الخاصة بها وإرفاقها كإثبات صلب الدفتر الكشفي!`
          : `⚠️ Alerte Justificatifs : ${missingInvsCount} opérations de décaissement ont été enregistrées sans photo de leur facture !`
      });
    }
  }

  return (
    <div className="space-y-8" id="scout-dashboard-root">
      
      {/* 🏛️ GAINT TOP ACTION BUTTONS (أول الصفحة وأكبر حجم) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 shrink-0">
        {/* BIG INCOME BUTTON */}
        <button 
          onClick={onQuickIncome}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-800 to-emerald-950 hover:from-emerald-750 hover:to-emerald-900 border border-emerald-900 hover:border-emerald-700 transition duration-200 cursor-pointer text-right p-6 sm:p-7 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] group flex flex-col justify-between h-44 select-none"
        >
          {/* Official scout seal ornament */}
          <div className="absolute top-2 left-2 text-[75px] text-white opacity-5 select-none pointer-events-none font-black translate-x-[-15px] translate-y-[15px]">
            ⚜️
          </div>
          <div className="flex justify-between items-start w-full">
            <span className="p-3 bg-emerald-900/80 rounded-xl border border-emerald-700 group-hover:bg-emerald-800/95 transition duration-200 shadow-sm">
              <TrendingUp className="w-8 h-8 text-amber-400 group-hover:scale-110 transition duration-200" />
            </span>
            <span className="bg-amber-400/20 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest leading-none">
              {locale === "ar" ? "قبض وإيداع جديد 📥" : "Nouvelle Recette 📥"}
            </span>
          </div>
          <div className="text-right">
            <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-amber-300 transition duration-150 leading-tight">
              {locale === "ar" ? "قبط وإدخال مدخول كشفي جديد 💵" : "Enregistrer une Recette (Entrée)"}
            </h3>
            <p className="text-[10px] text-emerald-200/80 font-medium mt-1 leading-normal max-w-sm">
              {locale === "ar" 
                ? "تسجيل معاليم الاشتراكات الكشفية السنوية أو مساهمات الأولياء والمحبين وتوليد ووصولات رسمية فوراً." 
                : "Saisie de cotisations de scouts, donations d'utilité publique et impression de reçu officiel."}
            </p>
          </div>
        </button>

        {/* BIG EXPENSE BUTTON */}
        <button 
          onClick={onQuickExpense}
          className="relative overflow-hidden bg-gradient-to-br from-[#881337] to-[#4c0519] hover:from-[#9f1239] hover:to-[#5e071e] border border-rose-950 hover:border-rose-900 transition duration-200 cursor-pointer text-right p-6 sm:p-7 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] group flex flex-col justify-between h-44 select-none"
        >
          {/* Official scout seal ornament */}
          <div className="absolute top-2 left-2 text-[75px] text-white opacity-5 select-none pointer-events-none font-black translate-x-[-15px] translate-y-[15px]">
            ⚜️
          </div>
          <div className="flex justify-between items-start w-full">
            <span className="p-3 bg-rose-950/80 rounded-xl border border-rose-800 group-hover:bg-rose-900 transition duration-200 shadow-sm">
              <TrendingDown className="w-8 h-8 text-rose-300 group-hover:scale-110 transition duration-200" />
            </span>
            <span className="bg-rose-400/20 text-rose-300 font-extrabold text-[10px] px-3 py-1 rounded-full border border-rose-405/30 uppercase tracking-widest leading-none">
              {locale === "ar" ? "صرف مرخص / مخرج مالي 📤" : "Nouveau Décaissement 📤"}
            </span>
          </div>
          <div className="text-right">
            <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-rose-200 transition duration-150 leading-tight">
              {locale === "ar" ? "تسجيل مصروف أو فاتورة صرف جديدة 💸" : "Enregistrer une Dépense (Sortie)"}
            </h3>
            <p className="text-[10px] text-rose-200/80 font-medium mt-1 leading-normal max-w-sm">
              {locale === "ar" 
                ? "توثيق شراء مستلزمات الأنشطة، معدات المخيم والخيام مع تصوير وإرفاق الفاتورة فورياً للإثبات." 
                : "Archivage de factures d'alimentation, location transport et outillage avec capture photo."}
            </p>
          </div>
        </button>
      </div>

      {/* ⛺ Onboarding Welcome Empty State */}
      {scouts.length === 0 && expenses.length === 0 && incomes.length === 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-amber-50 p-6 rounded-2xl shadow-md border border-emerald-950 space-y-4 text-right">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-950 text-amber-400 rounded-full flex items-center justify-center">
              <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                {locale === "ar" ? "مرحباً بك في الكراس المالي الرقمي الكشفي!" : "Bienvenue dans le Registre de Trésorerie !"}
              </h3>
              <p className="text-3xs sm:text-2xs text-emerald-250 mt-0.5 font-bold">
                {locale === "ar" 
                  ? "الدفتر المالي حالياً فارغ كلياً وجاهز لاستعمال فوجك الكشفي التونسي الفعلي بكامل الخصوصية."
                  : "Le registre est vide et prêt pour l'intendance de votre camp scout."}
              </p>
            </div>
          </div>
          
          <p className="text-3xs sm:text-2xs text-zinc-200 leading-relaxed font-semibold">
            {locale === "ar"
              ? "يمكنك البدء مباشرة بتبويب وسجل بيانات فوجك الكشفي في لوحة الخيارات، أو شحن البيانات التوضيحية الجاهزة فوراً بضغطة واحدة لاختبار الإحصائيات، معايير التحليل والميزات الذكية المصممة لدينا."
              : "Commencez à enregistrer vos troupes et opérations réelles, ou chargez notre jeu d'essai préprogrammé pour explorer la puissance des rapports et tableaux de bord d'archivage."}
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button 
              onClick={() => setActiveTab("settings")}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-3xs px-4 py-2 rounded-xl transition shadow cursor-pointer"
            >
              {locale === "ar" ? "⚙️ إعدادات الفوج الجديد" : "Paramètres du Camp"}
            </button>
            {onLoadDemoData && (
              <button 
                onClick={onLoadDemoData}
                className="bg-emerald-800 hover:bg-emerald-700 hover:text-white text-white border border-emerald-700/60 font-black text-3xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                {locale === "ar" ? "💡 شحن بيانات تجريبية للتجربة فوراً" : "Charger le modèle démo"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ Alerts Notification Feed */}
      {systemAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 rounded-xl p-4 shrink-0 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-100">
              {locale === "ar" ? "نظام التنبيهات والذكاء المالي تلقائي" : "Notifications de Trésorerie"}
            </h3>
          </div>
          <div className="space-y-2">
            {systemAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                className={`text-xs p-2.5 rounded-lg flex items-center gap-2.5 ${
                  alert.type === "danger" 
                    ? "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border-l-4 border-rose-600" 
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border-l-4 border-amber-500"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${alert.type === "danger" ? "bg-rose-600" : "bg-amber-500"}`} />
                <span className="font-medium">{alert.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 💰 Grid Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Balance Card */}
        <div className="bg-emerald-900 text-amber-50 rounded-2xl p-6 shadow-xl relative overflow-hidden border border-emerald-950">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
            <DollarSign className="w-32 h-32" />
          </div>
          <p className="text-xs font-semibold tracking-wider text-emerald-200 uppercase">
            {locale === "ar" ? "الرصيد النقدي الحالي للمخيم" : "SOLDE ACTUEL DIRECT"}
          </p>
          <h2 className="text-3.5xl font-black mt-2 tracking-tight">
            {formatTND(currentBalance, locale)}
          </h2>
          <div className="mt-4 flex items-center justify-between text-xs text-emerald-200/90 border-t border-emerald-800 pt-3">
            <span>{locale === "ar" ? "الكفاءة والحساب اللحظي" : "Calcul en temps réel"}</span>
            <span className="bg-amber-500 text-amber-950 px-2 py-0.5 rounded-full font-bold">
              {locale === "ar" ? "سليم" : "Actif"}
            </span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-zinc-805">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {locale === "ar" ? "إجمالي الإيرادات والمداخيل" : "Total Recettes"}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-800 dark:text-emerald-400">
                {formatTND(totalIncome, locale)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 rounded-xl text-emerald-800 dark:text-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 border-t dark:border-zinc-850 pt-3 flex gap-2">
            <span className="text-emerald-600 font-bold">{activeIncomes.length}</span>
            <span>{locale === "ar" ? "عمليات إيداع" : "transactions"}</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-zinc-805">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {locale === "ar" ? "المصاريف الجملية المعتمدة" : "Total Dépenses"}
              </p>
              <h3 className="text-2xl font-bold mt-1 text-rose-750 dark:text-rose-450">
                {formatTND(totalExpense, locale)}
              </h3>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950 rounded-xl text-rose-700 dark:text-rose-200">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 border-t dark:border-zinc-850 pt-3 flex gap-2">
            <span className="text-rose-600 font-bold">{activeExpenses.length}</span>
            <span>{locale === "ar" ? "وصول وفواتير" : "dépenses enregistrées"}</span>
          </div>
        </div>

        {/* Scout Subscriptions */}
        <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 shadow-sm border border-amber-100 dark:border-zinc-805">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium font-sans">
                {locale === "ar" ? "مؤشر سداد الكشافة" : "Paiement des Scouts"}
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-500">{scoutsPaidFully}</span>
                <span className="text-xs text-zinc-400 font-sans">/ {totalScoutsCount}</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-700 dark:text-amber-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-2xs space-y-1 block border-t dark:border-zinc-850 pt-2.5">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>{locale === "ar" ? "سدد بالكامل" : "Payé"} : {scoutsPaidFully}</span>
              <span>{locale === "ar" ? "جزئي" : "Partiel"} : {scoutsPaidPartially}</span>
              <span>{locale === "ar" ? "لم يسدد" : "Non payé"} : {scoutsUnpaid}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Cards stats row container spacing helper */}

      {/* 📊 Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Planned vs Actual expenditure comparison */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
          <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 mb-4 border-b pb-2 dark:border-zinc-850 flex items-center justify-between">
            <span>{locale === "ar" ? "مقارنة الميزانية: التقديرية vs المنفقة" : "Budget : Prévu vs Consommé"}</span>
            <span className="text-2xs font-mono font-medium text-zinc-400">TND</span>
          </h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="التقديرية" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="المنفقة" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Cash Flow Evolution Curve */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-5 rounded-2xl shadow-xs">
          <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 mb-4 border-b pb-2 dark:border-zinc-850 flex items-center justify-between">
            <span>{locale === "ar" ? "مخطط الرصيد اليومي لتأمين الخزن" : "Courbe d'évolution de la trésorerie"}</span>
            <span className="text-2xs font-mono font-medium text-emerald-600">TND</span>
          </h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dailyBalanceData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="الرصيد" stroke="#047857" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBalance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense distribution Pie Chart directly */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-5 rounded-2xl shadow-xs lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="md:col-span-1 space-y-4">
              <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 mb-2 border-b pb-2 dark:border-zinc-850">
                {locale === "ar" ? "توزيع المصاريف على البنود الكشفية" : "Répartition analytique des charges"}
              </h3>
              <p className="text-2xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {locale === "ar" 
                  ? `يظهر المخطط البياني والجدول الجانبي نسب توزيع الأموال والمصاريف المنفذة فعلياً على البنود المختلفة لـ ${campSetup.campName || "المخيم الكشفي"}.` 
                  : "Analyse statistique de la répartition des dépenses réelles par poste de coût."}
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pieData.map((d, index) => {
                  const percent = totalExpense > 0 ? (d.value / totalExpense) * 100 : 0;
                  return (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[120px]">{d.name}</span>
                      </div>
                      <span className="font-bold text-zinc-650 dark:text-zinc-455">
                        {percent.toFixed(0)}% ({formatTND(d.value, locale)})
                      </span>
                    </div>
                  );
                })}
                {pieData.length === 0 && (
                  <div className="text-xs text-zinc-400 py-3 text-center">
                    {locale === "ar" ? "لا توجد مصاريف معتمدة لعرضها" : "Aucune dépense approuvée"}
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 flex justify-center items-center h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${parseFloat(value).toFixed(3)} TND`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-zinc-400 text-center py-12">
                  {locale === "ar" ? "قم بإدخال مصاريف لرؤية التمثيل الدائري" : "Enregistrez des dépenses pour débloquer le diagramme"}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* 📊 Budget Execution Progress Section */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs">
        <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 mb-5 pb-2 border-b dark:border-zinc-850">
          {locale === "ar" ? "نسبة تنفيذ ميزانية البنود الكشفية" : "Consommation Budgétaire par Rubrique"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {categoryStats.map((stat, i) => {
            const isExceeded = stat.percentage >= 100;
            const isNear = stat.percentage >= 80 && stat.percentage < 100;
            return (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-800 dark:text-zinc-200">{locale === "ar" ? stat.labelAr : stat.labelFr}</span>
                  <span className="font-bold text-zinc-650 dark:text-zinc-400">
                    {formatTND(stat.spent, locale)} / <span className="text-zinc-400 dark:text-zinc-500 font-normal">{formatTND(stat.planned, locale)}</span>
                  </span>
                </div>
                <div className="relative w-full h-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded 
                        ? "bg-rose-600" 
                        : isNear 
                          ? "bg-amber-500" 
                          : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-2xs">
                  <span className={`${isExceeded ? "text-rose-600 font-bold" : isNear ? "text-amber-600 font-bold" : "text-zinc-400"}`}>
                    {stat.percentage.toFixed(0)}% {locale === "ar" ? "مستهلك" : "consommé"}
                  </span>
                  {isExceeded && (
                    <span className="text-rose-600 font-bold text-2xs">
                      {locale === "ar" ? "تجاوز الميزانية!" : "Dépassement !"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🕒 Last 5 transactions */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-6 rounded-2xl shadow-xs">
        <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-zinc-850">
          <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100">
            {locale === "ar" ? "آخر 5 عمليات في الدفتر المالي للمخيم" : "Derniers 5 Mouvements"}
          </h3>
          <button 
            onClick={() => setActiveTab("transactions")}
            className="text-emerald-800 dark:text-emerald-400 hover:underline text-xs font-bold"
          >
            {locale === "ar" ? "عرض كل العمليات ←" : "Toutes les opérations ←"}
          </button>
        </div>
        
        <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
          {combinedOperations.map((op, idx) => {
            const isInc = op.opType === "income";
            const categoryObj = !isInc ? categories.find(c => c.code === (op as Expense).category) : null;
            return (
              <div key={idx} className="py-3.5 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    isInc 
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                      : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}>
                    {isInc ? "💰" : (categoryObj?.emoji || "💸")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {isInc ? op.payerName : (op as Expense).supplier}
                    </p>
                    <p className="text-2xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {isInc ? (op as Income).note || "مداخيل مستلمة" : (op as Expense).description}
                    </p>
                    <span className="text-2xs text-zinc-400 mt-1 block">
                      {formatDate(op.date, locale)} | {locale === "ar" ? "بواسطة" : "Par"} {op.registeredBy}
                    </span>
                  </div>
                </div>

                <div className="text-left shrink-0 block">
                  <div className={`font-extrabold text-sm ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                    {isInc ? "+" : "-"}{formatTND(op.amount, locale)}
                  </div>
                  <span className="text-3xs block px-1.5 py-0.5 rounded-sm bg-zinc-100 dark:bg-zinc-900 mt-1 dark:text-zinc-400">
                    {isInc 
                      ? (locale === "ar" ? "مداخيل" : "Recette")
                      : (locale === "ar" ? "مصروف" : "Dépense")}
                  </span>
                </div>
              </div>
            );
          })}
          {combinedOperations.length === 0 && (
            <div className="text-xs text-zinc-400 py-6 text-center">
              {locale === "ar" ? "دفاتر المخيم فارغة حتى الآن" : "Aucun mouvement financier enregistré."}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
