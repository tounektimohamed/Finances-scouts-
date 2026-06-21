import React, { useState } from "react";
import { Expense, Income, Scout, CampSetup, ExpenseCategoryCode } from "../types";
import { formatTND, formatDate, calculateCampDays } from "../utils/helpers";
import { CATEGORIES_LIST } from "../initialData";
import { FileText, Printer, Download, Share2, Mail, Users, Calculator } from "lucide-react";
import OfficialBookletReport from "./OfficialBookletReport";

interface ReportExportsProps {
  expenses: Expense[];
  incomes: Income[];
  scouts: Scout[];
  campSetup: CampSetup;
  locale: "ar" | "fr";
  categories?: { code: string; labelAr: string; labelFr: string; emoji: string }[];
  leaderSignature?: string | null;
  treasurerSignature?: string | null;
}

type ReportType = "daily" | "ledger" | "category" | "scouts" | "final" | "official" | "all_operations";

export default function ReportExports({
  expenses,
  incomes,
  scouts,
  campSetup,
  locale,
  categories = CATEGORIES_LIST,
  leaderSignature = null,
  treasurerSignature = null
}: ReportExportsProps) {
  
  const [reportType, setReportType] = useState<ReportType>("final");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategoryCode>("nutrition");

  // Filter exclusions (cancelled items are excluded from accounting balance sheets)
  const activeApprovedExp = expenses.filter(e => !e.isCancelled && e.status === "approved");
  const activeIncomes = incomes.filter(i => !i.isCancelled);

  // Totals calculations
  const totalIncome = activeIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = activeApprovedExp.reduce((acc, curr) => acc + curr.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  // Combine incomes and expenses into a single chronological array of operations
  const chronologicalOps = [
    ...activeIncomes.map(i => ({
      id: `income-${i.id}`,
      invoiceCode: i.receiptNo,
      date: i.date,
      type: "income" as const,
      party: i.payerName,
      category: locale === "ar" ? "📥 مداخيل عامة واشتراكات" : "Recettes / Cotisations",
      description: i.note || (locale === "ar" ? "قبض مداخيل ومشاركة مخيم" : "Encaissement recette"),
      method: i.method === "cash" ? "cash" : "non-cash",
      amount: i.amount
    })),
    ...activeApprovedExp.map(e => ({
      id: `expense-${e.id}`,
      invoiceCode: e.invoiceCode || `F-26-${e.id}`,
      date: e.date,
      type: "expense" as const,
      party: e.supplier,
      category: categories.find(c => c.code === e.category)?.[locale === "ar" ? "labelAr" : "labelFr"] || e.category,
      description: e.description,
      method: "cash",
      amount: e.amount
    }))
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate moving/running balances
  let runningBal = 0;
  const opsWithRunningBal = chronologicalOps.map(op => {
    if (op.type === "income") {
      runningBal += op.amount;
    } else {
      runningBal -= op.amount;
    }
    return {
      ...op,
      runningBalance: runningBal
    };
  });

  // Render variables according to active Report Type
  let reportTitle = "";
  let reportSub = "";
  let reportIncomes: Income[] = [];
  let reportExpenses: Expense[] = [];
  let customCalculationsNode: React.ReactNode = null;

  if (reportType === "daily") {
    reportTitle = locale === "ar" ? `التقرير المالي اليومي ليوم ${formatDate(selectedDate, locale)}` : `Rapport financier journalier - ${selectedDate}`;
    reportSub = locale === "ar" ? "يعرض جميع عمليات الإيداع والصرف المعتمدة في هذا اليوم." : "Historique de tous les flux validés à cette date.";
    reportIncomes = activeIncomes.filter(i => i.date.split("T")[0] === selectedDate);
    reportExpenses = activeApprovedExp.filter(e => e.date.split("T")[0] === selectedDate);
  } else if (reportType === "ledger") {
    reportTitle = locale === "ar" ? "كشف حساب الدفتر المالي العام للمخيم" : "Grand livre complet de la trésorerie";
    reportSub = locale === "ar" ? "تقرير مالي شامل لجميع العمليات المعتمدة لضمان التدقيق القيادي للفوج." : "Audit complet de l'intégralité des flux cash.";
    reportIncomes = activeIncomes;
    reportExpenses = activeApprovedExp;
  } else if (reportType === "category") {
    const catObj = categories.find(c => c.code === selectedCategory);
    reportTitle = locale === "ar" ? `كشف تفصيلي لبند: ${catObj?.labelAr || selectedCategory}` : `Suivi analytique : ${catObj?.labelFr || selectedCategory}`;
    reportSub = locale === "ar" ? "يعرض جميع حركات الصرف المسجلة والمعتمدة لهذا البند تحديداً." : "Historique des dépenses validées sous cette rubrique d'intendance.";
    reportExpenses = activeApprovedExp.filter(e => e.category === selectedCategory);
    
    // Custom calculations for category planned vs actual
    const planned = campSetup.plannedBudgets[selectedCategory] || 0;
    const actual = reportExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const pct = planned > 0 ? (actual / planned) * 100 : 0;
    
    customCalculationsNode = (
      <div className="grid grid-cols-2 gap-4 bg-orange-50/50 dark:bg-zinc-900/60 p-4 rounded-xl text-3xs border border-orange-100 dark:border-zinc-800 text-right">
        <div>
          <p className="text-zinc-500 font-bold">{locale === "ar" ? "الميزانية المخططة للبند" : "Budget prévu"}</p>
          <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 mt-0.5">{formatTND(planned, locale)}</p>
        </div>
        <div>
          <p className="text-zinc-500 font-bold">{locale === "ar" ? "المنفق الفعلي ونسبة التنفيذ" : "Dépense réelle & Taux"}</p>
          <p className="text-sm font-black text-rose-700 dark:text-rose-400 mt-0.5">
            {formatTND(actual, locale)} ({pct.toFixed(0)}%)
          </p>
        </div>
      </div>
    );
  } else if (reportType === "scouts") {
    reportTitle = locale === "ar" ? "كشف اشتراكات الكشافة ومعلوم المشاركة" : "Registre de paiement des scouts";
    reportSub = locale === "ar" ? "حالة الدفع الكلية وتوزيع الدفعات الجزئية والمبالغ الكلية المستحقة." : "Tableau de bord nominatif d'encaissement des camps.";
  } else if (reportType === "final") {
    reportTitle = locale === "ar" ? `التقرير الختامي لـ ${campSetup.campName}` : "Rapport de synthèse de clôture";
    reportSub = locale === "ar" ? "ملخص نهائي شامل يبرز الكفاءة المالية وصافي الرصيد المتبقي للأرشيف." : "Synthèse finale de clôture d'intendance du camp.";
    
    // Calculations for the final summary card
    const campDays = calculateCampDays(campSetup.startDate, campSetup.endDate);
    const totalPersons = campSetup.scoutCount + campSetup.leaderCount;
    const transportExpense = activeApprovedExp
      .filter(e => e.category === "transport")
      .reduce((sum, e) => sum + e.amount, 0);
    const expenseWithoutTransport = totalExpense - transportExpense;

    const costPerPerson = totalPersons > 0 ? totalExpense / totalPersons : 0;
    const costPerPersonPerDay = totalPersons > 0 && campDays > 0 ? totalExpense / totalPersons / campDays : 0;
    const costPerPersonNoTransport = totalPersons > 0 ? expenseWithoutTransport / totalPersons : 0;
    const costPerPersonPerDayNoTransport = totalPersons > 0 && campDays > 0 ? expenseWithoutTransport / totalPersons / campDays : 0;

    customCalculationsNode = (
      <div className="space-y-4 text-xs font-medium text-right">
        {/* Main summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900 p-5 rounded-2xl border dark:border-zinc-800">
          <div>
            <p className="text-zinc-500 font-bold">{locale === "ar" ? "إجمالي المصاريف" : "Dépenses totales"}</p>
            <p className="text-base font-black text-rose-700 dark:text-rose-400 mt-1">{formatTND(totalExpense, locale)}</p>
          </div>
          <div>
            <p className="text-zinc-500 font-bold">{locale === "ar" ? "إجمالي المداخيل" : "Recettes totales"}</p>
            <p className="text-base font-black text-emerald-800 dark:text-emerald-400 mt-1">{formatTND(totalIncome, locale)}</p>
          </div>
          <div>
            <p className="text-zinc-500 font-bold">{locale === "ar" ? "صافي الوفورات / الفائض" : "Excédent de caisse"}</p>
            <p className={`text-base font-black mt-1 ${currentBalance >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{formatTND(currentBalance, locale)}</p>
          </div>
        </div>

        {/* Cost per person with/without transport */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-amber-50/70 dark:bg-zinc-900/60 p-5 rounded-2xl border border-amber-200 dark:border-zinc-800">
            <p className="text-zinc-500 font-bold text-2xs mb-2">{locale === "ar" ? "💰 التكلفة شاملة التنقل" : "💰 Coût AVEC transport"}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-amber-200/50 dark:border-zinc-700 pb-1.5">
                <span className="font-black text-sm">{formatTND(costPerPerson, locale)}</span>
                <span className="text-zinc-500 text-3xs">{locale === "ar" ? "تكلفة الفرد طيلة النشاط" : "Par personne (total)"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-sm">{formatTND(costPerPersonPerDay, locale)}</span>
                <span className="text-zinc-500 text-3xs">{locale === "ar" ? `تكلفة الفرد لـ ${campDays} أيام` : `Par personne / ${campDays} jours`}</span>
              </div>
            </div>
          </div>

          <div className="bg-sky-50/70 dark:bg-zinc-900/60 p-5 rounded-2xl border border-sky-200 dark:border-zinc-800">
            <p className="text-zinc-500 font-bold text-2xs mb-2">{locale === "ar" ? "💰 التكلفة دون التنقل" : "💰 Coût SANS transport"}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-sky-200/50 dark:border-zinc-700 pb-1.5">
                <span className="font-black text-sm">{formatTND(costPerPersonNoTransport, locale)}</span>
                <span className="text-zinc-500 text-3xs">{locale === "ar" ? "تكلفة الفرد طيلة النشاط" : "Par personne (total)"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-sm">{formatTND(costPerPersonPerDayNoTransport, locale)}</span>
                <span className="text-zinc-500 text-3xs">{locale === "ar" ? `تكلفة الفرد لـ ${campDays} أيام` : `Par personne / ${campDays} jours`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-3xs text-zinc-500">
          <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-800">
            <p className="font-bold">{locale === "ar" ? "عدد المشاركين" : "Participants"}</p>
            <p className="font-black text-zinc-800 dark:text-zinc-200 mt-0.5">{totalPersons} ({locale === "ar" ? `${campSetup.scoutCount} كشاف + ${campSetup.leaderCount} قائد` : `${campSetup.scoutCount} scouts + ${campSetup.leaderCount} chefs`})</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-800">
            <p className="font-bold">{locale === "ar" ? "مدة النشاط" : "Durée"}</p>
            <p className="font-black text-zinc-800 dark:text-zinc-200 mt-0.5">{campDays} {locale === "ar" ? "أيام" : "jours"}</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-800">
            <p className="font-bold">{locale === "ar" ? "تكاليف النقل" : "Transport"}</p>
            <p className="font-black text-zinc-800 dark:text-zinc-200 mt-0.5">{formatTND(transportExpense, locale)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border dark:border-zinc-800">
            <p className="font-bold">{locale === "ar" ? "باقي المصاريف" : "Autres dépenses"}</p>
            <p className="font-black text-zinc-800 dark:text-zinc-200 mt-0.5">{formatTND(expenseWithoutTransport, locale)}</p>
          </div>
        </div>
      </div>
    );
  } else if (reportType === "official") {
    reportTitle = locale === "ar" ? "الكشف المالي الإجمالي الرسمي (ص. 23 - 24)" : "Rapport financier global officiel (p. 23 - 24)";
    reportSub = locale === "ar" ? "النموذج المعتمد رسمياً لدى لجنة المالية والمراقبة بالكشافة التونسية." : "Modèle de rapport officiel de la Fédération des Scouts Tunisiens.";
    reportIncomes = activeIncomes;
    reportExpenses = activeApprovedExp;
  } else if (reportType === "all_operations") {
    reportTitle = locale === "ar" ? "📊 سجل العمليات التاريخي الشامل ومذكرة الرصيد المالي" : "Rapport Chronologique Global & Bilan de Trésorerie";
    reportSub = locale === "ar" ? "كشف متكامل بكافة حركات مداخيل ومصاريف الصندوق مرتبة بالتاريخ مع الرصيد التراكمي وتوزيع الميزانية الفعلي." : "Historique unifié de tous les flux cash avec suivi du solde progressif et écarts de budget.";
    reportIncomes = activeIncomes;
    reportExpenses = activeApprovedExp;
  }

  // Trigger Native Dynamic Print
  const handlePrint = () => {
    const printArea = document.querySelector('.printable-area');
    if (!printArea) return;

    // 1. Create a temporary container on document.body for reliable sandboxed printing
    const tempDiv = document.createElement('div');
    tempDiv.className = 'temp-print-container-report';
    tempDiv.dir = locale === "ar" ? "rtl" : "ltr";
    tempDiv.innerHTML = printArea.outerHTML;
    document.body.appendChild(tempDiv);

    // 2. Inject print simulation styles that hide the app root and show only the report
    const styleEl = document.createElement('style');
    styleEl.id = 'report-print-style-in-place';
    styleEl.innerHTML = `
      @media print {
        #root {
          display: none !important;
        }
        .temp-print-container-report {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          padding: 24px !important;
          margin: 0 !important;
        }
        /* Ensure dark mode class overrides don't ruin contrast, force white bg */
        .temp-print-container-report > div {
          background-color: white !important;
          color: black !important;
          border-color: #e4e4e7 !important;
          shadow: none !important;
          box-shadow: none !important;
        }
        .no-print {
          display: none !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      @media screen {
        .temp-print-container-report {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // 3. Call standard native window.print() (safe everywhere)
    window.print();

    // 4. Safely clean up elements
    setTimeout(() => {
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    }, 1500);
  };

  const handleDownloadReportHTML = () => {
    const printArea = document.querySelector('.printable-area');
    if (!printArea) return;

    const docTypeLabel = reportType === "official"
      ? (locale === "ar" ? "الكشف_المالي_الإجمالي_الرسمي_مخيم" : "rapport_officiel_camp")
      : reportType === "scouts" 
        ? (locale === "ar" ? "تقرير_اشتراكات_الكشافة" : "rapport_inscriptions_scouts")
        : reportType === "all_operations"
          ? (locale === "ar" ? "سجل_العمليات_التاريخي_والتقرير_المالي" : "rapport_chronologique_financier_complet")
          : reportType === "incomes"
            ? (locale === "ar" ? "تقرير_المداخيل_المالية" : "rapport_recettes")
            : (locale === "ar" ? "تقرير_المصاريف_والتكاليف" : "rapport_depenses");

    let htmlContent = "";

    if (reportType === "official") {
      let activityType = "مخيم صيفي كشفي";
      let structureName = "فوج الكشافة";
      let activityTarget = "فرقة الكشافة والفتيان";
      let sessionName = "دورة 2026";
      let cityName = campSetup.campName.includes("عين دراهم") ? "عين دراهم" : "مركز التخييم الكشفي";
      let daysCount = 10;
      let leaderCountNum = campSetup.leaderCount || 8;
      let staffCount = 3;
      let leaderName = "القائد طارق بن عمار";
      let leaderTitle = "قائد النشاط";
      let treasurerName = "القائد علي النفزي";
      let treasurerTitle = "مقتصد النشاط";

      const holder = document.getElementById("official-meta-holder");
      if (holder) {
        activityType = holder.getAttribute("data-activity-type") || activityType;
        structureName = holder.getAttribute("data-structure-name") || structureName;
        activityTarget = holder.getAttribute("data-activity-target") || activityTarget;
        sessionName = holder.getAttribute("data-session-name") || sessionName;
        cityName = holder.getAttribute("data-city-name") || cityName;
        daysCount = Number(holder.getAttribute("data-days-count")) || daysCount;
        leaderCountNum = Number(holder.getAttribute("data-leader-count")) || leaderCountNum;
        staffCount = Number(holder.getAttribute("data-staff-count")) || staffCount;
        leaderName = holder.getAttribute("data-leader-name") || leaderName;
        leaderTitle = holder.getAttribute("data-leader-title") || leaderTitle;
        treasurerName = holder.getAttribute("data-treasurer-name") || treasurerName;
        treasurerTitle = holder.getAttribute("data-treasurer-title") || treasurerTitle;
      }

      const getCategorySum = (code: string) => {
        return activeApprovedExp
          .filter(e => e.category === code)
          .reduce((sum, e) => sum + e.amount, 0);
      };

      const getWagesSum = () => {
        return activeApprovedExp
          .filter(e => {
            const desc = (e.description || "").toLowerCase();
            const note = (e.note || "").toLowerCase();
            return desc.includes("أجر") || desc.includes("تعويض") || desc.includes("أجرة") || desc.includes("إكرامية") || desc.includes("راتب") ||
                   note.includes("أجر") || note.includes("تعويض") || note.includes("أجرة") || note.includes("إكرامية") || note.includes("راتب");
          })
          .reduce((sum, e) => sum + e.amount, 0);
      };

      const wagesTotal = getWagesSum();
      const nutritionTotal = getCategorySum("nutrition");
      const transportTotal = getCategorySum("transport");
      const lodgingTotal = getCategorySum("lodging");
      const activitiesTotal = getCategorySum("activities");
      const printingTotal = getCategorySum("printing");
      const healthTotal = getCategorySum("health");
      const mediaTotal = getCategorySum("media");
      const miscTotal = Math.max(0, getCategorySum("misc") - activeApprovedExp
        .filter(e => e.category === "misc" && (
          (e.description || "").includes("أجر") || (e.description || "").includes("تعويض") || (e.description || "").includes("أجرة") || (e.description || "").includes("إكرامية")
        ))
        .reduce((sum, e) => sum + e.amount, 0)
      );

      const scoutsCount = scouts.length > 0 ? scouts.length : campSetup.scoutCount;

      htmlContent = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${locale === "ar" ? "الكشف المالي الإجمالي الرسمي" : "Rapport Officiel"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      direction: ${locale === "ar" ? "rtl" : "ltr"};
      margin: 0;
      padding: 30px;
      background-color: #f3f4f6;
      color: #1f2937;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .action-bar {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      max-width: 820px;
    }
    .btn {
      padding: 10px 18px;
      font-size: 13px;
      font-weight: bold;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .btn-primary {
      background-color: #064e3b;
      color: white;
      border: none;
    }
    .btn-secondary {
      background-color: #fff;
      color: #4b5563;
    }
    .page-sheet {
      background-color: #fbfbf6;
      border: 1px dashed #d97706;
      border-radius: 20px;
      padding: 30px;
      width: 100%;
      max-width: 820px;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      margin-bottom: 40px;
      position: relative;
    }
    .scout-border {
      border: 4px double #064e3b;
      border-radius: 12px;
      padding: 25px;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 320px;
      color: #064e3b;
      opacity: 0.02;
      pointer-events: none;
      user-select: none;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      border-bottom: 2px dashed rgba(6, 78, 59, 0.25);
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .title-banner {
      font-size: 18px;
      font-weight: 900;
      color: #064e3b;
      text-align: center;
      margin-bottom: 20px;
      text-decoration: underline;
      text-underline-offset: 6px;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .meta-field {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: bold;
    }
    .meta-field span {
      white-space: nowrap;
    }
    .dotted-line {
      flex: 1;
      border-bottom: 1.5px dotted #6b7280;
      padding-bottom: 2px;
      font-weight: 800;
      color: #111827;
      text-align: center;
    }
    .boxes-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 25px;
    }
    .box-item {
      border: 1.5px solid #064e3b;
      background-color: rgba(6, 78, 59, 0.03);
      border-radius: 8px;
      padding: 8px;
    }
    .box-item.primary {
      background-color: #064e3b;
      color: white;
    }
    .sec-title {
      font-size: 14px;
      font-weight: 900;
      color: #064e3b;
      border-right: 4px solid #064e3b;
      padding-right: 8px;
      margin-top: 20px;
      margin-bottom: 12px;
    }
    .formula-row {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      font-weight: bold;
      font-size: 13px;
    }
    .num-box {
      border: 1px solid #d1d5db;
      background-color: white;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 900;
      color: #065f46;
    }
    .num-box.total {
      border-color: #064e3b;
      background-color: #ecfdf5;
      font-size: 14px;
    }
    .dotted-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    .dotted-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .value-box {
      font-family: monospace;
      font-weight: bold;
      font-size: 14px;
      border: 1.5px solid #cbd5e1;
      background-color: white;
      padding: 4px 8px;
      border-radius: 6px;
      width: 120px;
      text-align: left;
      color: #059669;
    }
    .value-box.expense {
      color: #dc2626;
    }
    .grand-total-banner {
      background-color: #064e3b;
      color: white;
      border-radius: 10px;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 14px;
      margin-top: 20px;
    }
    .grand-total-banner.expense {
      background-color: #fee2e2;
      border: 2px solid #b91c1c;
      color: #7f1d1d;
    }
    .corner-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #6b7280;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
    }
    .corner-num {
      font-weight: 900;
      background-color: #e5e7eb;
      color: #1f2937;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-top: 30px;
      border-top: 1px dashed #064e3b;
      padding-top: 20px;
    }
    .sig-col {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-title-header {
      font-size: 12px;
      font-weight: 950;
      color: #064e3b;
      margin-bottom: 8px;
    }
    .sig-outline-box {
      border: 1px dashed #a1a1aa;
      background-color: rgba(255, 255, 255, 0.6);
      border-radius: 8px;
      width: 100%;
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .sig-name-display {
      font-size: 12px;
      font-weight: bold;
      color: #111827;
    }
    
    @media print {
      body {
        background-color: white !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .page-sheet {
        box-shadow: none !important;
        border: none !important;
        background-color: white !important;
        max-width: 100% !important;
        page-break-after: always !important;
        padding: 5px 0 !important;
        margin-bottom: 0 !important;
      }
      .page-sheet:last-of-type {
        page-break-after: avoid !important;
      }
      .scout-border {
        border-width: 4px !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <button onclick="window.print()" class="btn btn-primary">
      <span>🖨️ ${locale === "ar" ? "بدء طباعة الكشف كـ PDF" : "Imprimer / Sauvegarder en PDF"}</span>
    </button>
    <button onclick="window.close()" class="btn btn-secondary">
      <span>✕ ${locale === "ar" ? "إغلاق الصفحة" : "Fermer"}</span>
    </button>
  </div>

  <!-- PAGE 1 (PAGE 23: INCOMES) -->
  <div class="page-sheet">
    <div class="scout-border">
      <div class="watermark">⚜️</div>
      <div class="header-row">
        <div style="font-weight: 900; font-size: 13px; color: #064e3b;">منظمة الكشافة التونسية</div>
        <div style="font-size: 10px; font-weight: bold; text-align: left; color: #6b7280; max-width: 280px;">
          نظير يرسل إلى القيادة العامة في ظرف شهر من نهاية النشاط
        </div>
      </div>

      <div class="title-banner">كشف مالي إجمالي للنشاط (مداخيل)</div>

      <div class="grid-meta">
        <div class="meta-field">
          <span>نوع النشاط:</span>
          <div class="dotted-line">${activityType}</div>
        </div>
        <div class="meta-field">
          <span>الدورة:</span>
          <div class="dotted-line">${sessionName}</div>
        </div>
        <div class="meta-field">
          <span>الهيكل:</span>
          <div class="dotted-line">${structureName}</div>
        </div>
        <div class="meta-field">
          <span>المكان:</span>
          <div class="dotted-line">${cityName}</div>
        </div>
        <div class="meta-field" style="grid-column: span 2;">
          <span>مخيم / ملتقى / دورة تكوينية لـ:</span>
          <div class="dotted-line">${activityTarget}</div>
        </div>
        <div class="meta-field" style="grid-column: span 2;">
          <span>التاريخ:</span>
          <span>من:</span> <span class="dotted-line">${campSetup.startDate}</span>
          <span>إلى:</span> <span class="dotted-line">${campSetup.endDate}</span>
        </div>
      </div>

      <div class="boxes-row">
        <div class="box-item">
          <div style="font-size: 9px; color: #6b7280; font-weight: bold; margin-bottom: 2px;">عدد الأيام</div>
          <div style="font-size: 14px; font-weight: 900; color: #111827;">${daysCount}</div>
        </div>
        <div class="box-item">
          <div style="font-size: 9px; color: #6b7280; font-weight: bold; margin-bottom: 2px;">عدد المشاركين</div>
          <div style="font-size: 14px; font-weight: 900; color: #111827;">${scoutsCount}</div>
        </div>
        <div class="box-item">
          <div style="font-size: 9px; color: #6b7280; font-weight: bold; margin-bottom: 2px;">عدد القادة</div>
          <div style="font-size: 14px; font-weight: 900; color: #111827;">${leaderCountNum}</div>
        </div>
        <div class="box-item">
          <div style="font-size: 9px; color: #6b7280; font-weight: bold; margin-bottom: 2px;">الإطار المسير</div>
          <div style="font-size: 14px; font-weight: 900; color: #111827;">${staffCount}</div>
        </div>
        <div class="box-item primary">
          <div style="font-size: 9px; color: #d1fae5; font-weight: bold; margin-bottom: 2px;">العدد الجملي</div>
          <div style="font-size: 14px; font-weight: 900;">${scoutsCount + leaderCountNum + staffCount}</div>
        </div>
      </div>

      <div class="sec-title">المداخيل :</div>

      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background-color: rgba(249, 250, 251, 0.5);">
          <div style="font-size: 12px; font-weight: 900; color: #374151; margin-bottom: 8px;">1- معلوم المشاركة:</div>
          <div class="formula-row">
            <div class="num-box">${campSetup.scoutFee.toFixed(3)} د.ت</div>
            <div>×</div>
            <div class="num-box">${scoutsCount} كشاف</div>
            <div>=</div>
            <div class="num-box total">${(campSetup.scoutFee * scoutsCount).toFixed(3)} د.ت</div>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background-color: rgba(249, 250, 251, 0.5);">
          <div style="font-size: 12px; font-weight: 900; color: #374151; margin-bottom: 8px;">2- المنح:</div>
          <div class="dotted-list">
            ${(() => {
              const grants = activeIncomes.filter(i => i.type === "grant");
              let html = "";
              for (let i = 0; i < 3; i++) {
                const g = grants[i];
                html += `
                <div class="dotted-row">
                  <span style="color: #6b7280;">• منحة:</span>
                  <div class="dotted-line">${g ? g.payerName : "..................................................................."}</div>
                  <div class="value-box">${g ? g.amount.toFixed(3) : "0.000"} د.ت</div>
                </div>`;
              }
              return html;
            })()}
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background-color: rgba(249, 250, 251, 0.5);">
          <div style="font-size: 12px; font-weight: 900; color: #374151; margin-bottom: 8px;">3- الدعم الاحتياطي والمداخيل الأخرى:</div>
          <div class="dotted-list">
            ${(() => {
              const supports = activeIncomes.filter(i => i.type !== "grant" && i.type !== "participation");
              let html = "";
              for (let i = 0; i < 2; i++) {
                const s = supports[i];
                html += `
                <div class="dotted-row">
                  <span style="color: #6b7280;">• دعم / تبرع:</span>
                  <div class="dotted-line">${s ? s.payerName : "..................................................................."}</div>
                  <div class="value-box">${s ? s.amount.toFixed(3) : "0.000"} د.ت</div>
                </div>`;
              }
              return html;
            })()}
          </div>
        </div>
      </div>

      <div class="grand-total-banner">
        <span>المجموع العام للمداخيل المقبوضة :</span>
        <span style="font-size: 16px;">${totalIncome.toFixed(3)} د.ت</span>
      </div>

      <div class="corner-label">
        <span>الكشافة التونسية © 2026</span>
        <span class="corner-num">صفحة 23</span>
      </div>

    </div>
  </div>

  <!-- PAGE 2 (PAGE 24: EXPENSES) -->
  <div class="page-sheet">
    <div class="scout-border">
      <div class="watermark">⚜️</div>
      <div class="header-row">
        <div style="font-weight: 900; font-size: 13px; color: #064e3b;">منظمة الكشافة التونسية</div>
        <div style="font-size: 10px; font-weight: bold; text-align: left; color: #6b7280;">المخصص / مصاريف</div>
      </div>

      <div class="title-banner" style="color: #b91c1c;">كشف مالي إجمالي للنشاط (مصاريف وصافي الدورة)</div>

      <div class="sec-title" style="color: #b91c1c; border-right-color: #b91c1c;">المصروفات الفعلية الموزعة :</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 13px; font-weight: bold; margin-top: 15px;">
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="dotted-row">
            <span style="color: #374151;">1- الأنشطة التربوية والورشات</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${activitiesTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">2- التأمين والعلاج الطبي</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${healthTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">3- النشر والإعلام والاتصال</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${mediaTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">4- الأجور والتعويضات</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${wagesTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">5- مصاريف مختلفة وطارئة</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${miscTotal.toFixed(3)} د.ت</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="dotted-row">
            <span style="color: #374151;">6- التغذية والإعاشة اليومية</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${nutritionTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">7- التنقل والمحروقات كراء الحافلة</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${transportTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">8- التجهيز والملبوسات والطباعة</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${printingTotal.toFixed(3)} د.ت</div>
          </div>
          <div class="dotted-row">
            <span style="color: #374151;">9- الإقامة وحجز مراكز التخييم</span>
            <div class="dotted-line"></div>
            <div class="value-box expense">${lodgingTotal.toFixed(3)} د.ت</div>
          </div>
        </div>
      </div>

      <div class="grand-total-banner expense">
        <span>المجموع العام النهائي للمصاريف الفعلية :</span>
        <span style="font-size: 16px;">${totalExpense.toFixed(3)} د.ت</span>
      </div>

      <div style="margin-top: 25px; padding: 15px; border: 1.5px solid #cbd5e1; border-radius: 12px; background-color: #fafafa;">
        <div style="font-size: 12px; font-weight: 900; text-align: center; margin-bottom: 12px; color: #1f2937;">الحصيلة المقارنة النهائية للدورة المالية :</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; font-size: 11px;">
          <div style="background-color: white; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px;">
            <div style="color: #6b7280; font-weight: bold; margin-bottom: 3px;">جملة المداخيل</div>
            <div style="font-weight: 900; color: #065f46; font-size: 12px;">${totalIncome.toFixed(3)} د.ت</div>
          </div>
          <div style="background-color: white; border: 1px solid #e5e7eb; padding: 8px; border-radius: 6px;">
            <div style="color: #6b7280; font-weight: bold; margin-bottom: 3px;">جملة المصاريف</div>
            <div style="font-weight: 900; color: #b91c1c; font-size: 12px;">${totalExpense.toFixed(3)} د.ت</div>
          </div>
          <div style="background-color: #f0fdf4; border: 1px solid #bcf0da; padding: 8px; border-radius: 6px;">
            <div style="color: #047857; font-weight: bold; margin-bottom: 3px;">الفائض (الربح)</div>
            <div style="font-weight: 900; color: #065f46; font-size: 12px;">${currentBalance >= 0 ? currentBalance.toFixed(3) : "0.000"} د.ت</div>
          </div>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 8px; border-radius: 6px;">
            <div style="color: #b91c1c; font-weight: bold; margin-bottom: 3px;">العجز المالي</div>
            <div style="font-weight: 900; color: #b91c1c; font-size: 12px;">${currentBalance < 0 ? Math.abs(currentBalance).toFixed(3) : "0.000"} د.ت</div>
          </div>
        </div>
      </div>

      <div class="signatures-block">
        <div class="sig-col">
          <div class="sig-title-header">${treasurerTitle}</div>
          <div class="sig-outline-box">
            <div>إمضاء وتأشيرة الحسابات</div>
            <div style="font-weight: 900; color: #111827; margin-top: 10px;">${treasurerName}</div>
          </div>
        </div>
        <div class="sig-col">
          <div class="sig-title-header">${leaderTitle}</div>
          <div class="sig-outline-box">
            <div>إمضاء وتأشيرة قائد النشاط</div>
            <div style="font-weight: 900; color: #111827; margin-top: 10px;">${leaderName}</div>
          </div>
        </div>
      </div>

      <div style="font-size: 10px; font-weight: 900; color: #064e3b; text-align: center; margin-top: 25px; border-t: 1px solid rgba(6, 78, 59, 0.1); padding-top: 10px;">
        ملاحظة هامّة: يجب إحترام الميزانية الموضوعة للنشاط والابتعاد عن العجز لتأمين النجاح المالي والتربوي للفوج. ⚜️
      </div>

      <div class="corner-label" style="border-top: none;">
        <span>كراس العهد والحياة المالية للفوج</span>
        <span class="corner-num">صفحة 24</span>
      </div>

    </div>
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;
    } else {
      htmlContent = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${locale === "ar" ? "تقرير مالي كشفي" : "Rapport Scout"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      direction: ${locale === "ar" ? "rtl" : "ltr"};
      margin: 0;
      padding: 30px 20px;
      background-color: #f4f4f5;
      color: #18181b;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .action-bar {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      max-width: 900px;
    }
    .btn {
      padding: 11px 18px;
      font-size: 13px;
      font-weight: bold;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .btn-primary {
      background-color: #065f46;
      color: white;
      border: none;
    }
    .btn-secondary {
      background-color: #fff;
      color: #27272a;
    }
    .printable-report {
      background-color: #ffffff;
      border: 1px solid #e4e4e7;
      border-radius: 16px;
      padding: 30px;
      width: 100%;
      max-width: 900px;
      box-sizing: border-box;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #f4f4f5;
      color: #27272a;
      font-weight: 800;
      text-align: inherit;
    }
    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid #e4e4e7;
      font-size: 13px;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }
    .text-rose-600 { color: #dc2626 !important; font-weight: bold; }
    .text-emerald-700 { color: #047857 !important; font-weight: bold; }
    .text-emerald-800 { color: #065f46 !important; font-weight: bold; }
    .text-amber-600 { color: #d97706 !important; font-weight: bold; }
    .font-black { font-weight: 900 !important; }
    .font-bold { font-weight: 700 !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .text-left { text-align: left !important; }
    .text-xs { font-size: 12px !important; }
    .text-sm { font-size: 14px !important; }
    .text-lg { font-size: 18px !important; }
    .p-4 { padding: 16px !important; }
    .mb-6 { margin-bottom: 24px !important; }
    .grid { display: grid !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .gap-4 { gap: 16px !important; }
    .rounded-xl { border-radius: 12px !important; }
    .border { border: 1px solid #e4e4e7 !important; }
    
    @media print {
      body {
        background-color: white !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .printable-report {
        border: none !important;
        padding: 0 !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar no-print">
    <button onclick="window.print()" class="btn btn-primary">
      <span>🖨️ ${locale === "ar" ? "بدء الطباعة وحفظ كـ PDF" : "Lancer l'impression / PDF"}</span>
    </button>
    <button onclick="window.close()" class="btn btn-secondary">
      <span>✕ ${locale === "ar" ? "إغلاق الصفحة" : "Fermer"}</span>
    </button>
  </div>

  <div class="printable-report">
    ${printArea.innerHTML}
  </div>

  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;
    }

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTypeLabel}_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as CSV Offline Blob
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for Arabic compatibility in Excel
    
    if (reportType === "scouts") {
      csvContent += "الاسم,رقم التسجيل,المبلغ المدفوع,المبلغ المتبقي,الحالة\n";
      scouts.forEach(s => {
        const rem = campSetup.scoutFee - s.amountPaid;
        const status = s.amountPaid >= campSetup.scoutFee ? "سدد بالكامل" : s.amountPaid > 0 ? "دفعة جزئية" : "لم يسدد";
        csvContent += `"${s.name}","${s.regNo}",${s.amountPaid},${rem},"${status}"\n`;
      });
    } else if (reportType === "all_operations") {
      csvContent += "الرقم,النوع,التاريخ,المورد أو المودع,البند/الفرع,الشرح والبيان,المبلغ بالدينار,الرصيد التراكمي\n";
      opsWithRunningBal.forEach((op, idx) => {
        const typeLabel = op.type === "income" ? "مدخول" : "مصروف";
        const amtSigned = op.type === "income" ? op.amount : -op.amount;
        csvContent += `${idx + 1},"${typeLabel}","${op.date.split("T")[0]}","${op.party}","${op.category}","${op.description}",${amtSigned},${op.runningBalance}\n`;
      });
    } else {
      csvContent += "النوع,التاريخ,المورد/أولياء,العنوان/البيان,المبلغ بالدينار,منسق العملية\n";
      reportIncomes.forEach(i => {
        csvContent += `"مدخول","${i.date.split("T")[0]}","${i.payerName}","${i.note || ""}","${i.amount}","${i.registeredBy}"\n`;
      });
      reportExpenses.forEach(e => {
        csvContent += `"مصروف","${e.date.split("T")[0]}","${e.supplier}","${e.description}","${e.amount}","${e.registeredBy}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_${reportType}_مخيم_الكشافة.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp Share Pre-formatted message
  const handleWhatsAppShare = () => {
    let text = `*تقرير مالي لـ ${campSetup.campName} 🏕️*\n\n`;
    text += `*نوع التقرير:* ${reportTitle}\n`;
    text += `*الرصيد النقدي المتوفر حالياً:* ${formatTND(currentBalance, "ar")}\n`;
    text += `*إجمالي المداخيل بالصندوق:* ${formatTND(totalIncome, "ar")}\n`;
    text += `*إجمالي المصاريف والمطبوعات:* ${formatTND(totalExpense, "ar")}\n\n`;
    
    if (reportType === "scouts") {
      const remainingUnpaid = scouts.filter(s => s.amountPaid === 0).length;
      text += `*حالة الاشتراكات:* هناك عدد ${remainingUnpaid} كشافة لم يسددوا معلوم المخيم بعد.\n`;
    }

    text += `\n_تم التوليد بنجاح عبر كراس المالية الرقمي الكشفي 2026_`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="space-y-6" id="report-view-root">
      
      {/* Upper selector & export trigger action row */}
      <div className="bg-white dark:bg-zinc-950 p-4 sm:p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-3xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        
        {/* Report configuration segments */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-lg px-3 py-2.5 sm:py-2 text-zinc-800 dark:text-zinc-200 focus:outline-emerald-800 w-full sm:w-auto"
          >
            <option value="official">{locale === "ar" ? "⚜️ الكشف المالي الرسمي (ص. 23-24)" : "Officiel p. 23-24"}</option>
            <option value="all_operations">{locale === "ar" ? "📊 التقرير التاريخي المفصل" : "Chronologique détaillé"}</option>
            <option value="final">{locale === "ar" ? "📋 التقرير الختامي" : "Rapport final"}</option>
            <option value="ledger">{locale === "ar" ? "📖 كشف الحساب العام" : "Grand livre"}</option>
            <option value="daily">{locale === "ar" ? "📅 تقرير يومي" : "Journalier"}</option>
            <option value="category">{locale === "ar" ? "🍞 تقرير بند ميزانية" : "Analytique"}</option>
            <option value="scouts">{locale === "ar" ? "🧍 كشف دفع المشاركين" : "Scouts"}</option>
          </select>

          {/* Sub controllers */}
          {reportType === "daily" && (
            <input 
              type="date"
              className="text-xs font-bold border rounded-lg px-3 py-2.5 sm:py-1.5 bg-zinc-50 text-zinc-800 focus:outline-emerald-800 w-full sm:w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {reportType === "category" && (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ExpenseCategoryCode)}
              className="text-xs font-bold border rounded-lg px-3 py-2.5 sm:py-1.5 bg-zinc-50 text-zinc-800 focus:outline-emerald-850 w-full sm:w-auto"
            >
              {categories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {locale === "ar" ? cat.labelAr : cat.labelFr}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Action triggers */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrint}
            className="bg-emerald-800 hover:bg-emerald-700 text-white text-3xs font-black uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 transition flex-1 sm:flex-none justify-center"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{locale === "ar" ? "طباعة 🖨️" : "Aperçu"}</span>
            <span className="sm:hidden">{locale === "ar" ? "طباعة" : "Print"}</span>
          </button>

          <button 
            onClick={handleDownloadReportHTML}
            className="bg-amber-600 hover:bg-amber-700 text-white text-3xs font-black uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 transition flex-1 sm:flex-none justify-center"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{locale === "ar" ? "تصدير HTML 📥" : "HTML"}</span>
            <span className="sm:hidden">{locale === "ar" ? "HTML" : "Export"}</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-3xs font-black uppercase tracking-wider px-3 py-2 rounded-lg flex items-center gap-1.5 transition flex-1 sm:flex-none justify-center"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{locale === "ar" ? "Excel CSV" : "Excel CSV"}</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button 
            onClick={handleWhatsAppShare}
            className="bg-[#25D366] text-white hover:bg-emerald-600 text-3xs font-black px-3 py-2 rounded-lg flex items-center gap-1.5 transition flex-1 sm:flex-none justify-center"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{locale === "ar" ? "مشاركة" : "Partager"}</span>
            <span className="sm:hidden">{locale === "ar" ? "مشاركة" : "Share"}</span>
          </button>
        </div>

      </div>

      {/* 🧾 Document Report Box (Styled beautifully for printable rendering) */}
      <div className={`${reportType === "official" ? "p-0 border-none bg-transparent dark:bg-transparent" : "bg-white dark:bg-zinc-1000 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-4 sm:p-8 shadow-sm space-y-6"} text-right relative printable-area text-zinc-800 dark:text-zinc-200`}>
        
        {reportType === "official" ? (
          <OfficialBookletReport
            expenses={expenses}
            incomes={incomes}
            scouts={scouts}
            campSetup={campSetup}
            locale={locale}
            activeIncomes={activeIncomes}
            activeApprovedExp={activeApprovedExp}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            currentBalance={currentBalance}
            leaderSignature={leaderSignature}
            treasurerSignature={treasurerSignature}
          />
        ) : (
          <>
            {/* Printable styled header */}
            <div className="border-b-2 border-emerald-800 pb-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
              <div className="space-y-1 block sm:order-last">
                <h2 className="font-black text-lg text-emerald-850 dark:text-emerald-400">{campSetup.campName || "الفوج الكشفي"}</h2>
                <p className="text-3xs text-zinc-400 font-bold uppercase tracking-wider">الكشافة التونسية © 2026</p>
                <p className="text-3xs text-zinc-500 font-bold">{campSetup.campName}</p>
              </div>
              
              <div className="space-y-1 block text-center sm:text-left sm:order-first">
                <span className="text-3xs font-mono font-bold text-zinc-400 block">{locale === "ar" ? "تحرير الدفاتر المالي" : "Grand livre d'intendance"}</span>
                <span className="text-2xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded font-bold inline-block">
                  {locale === "ar" ? "مستند معتمد للتدقيق" : "Document d'archivage"}
                </span>
              </div>
            </div>

            {/* Title details */}
            <div className="space-y-1.5 block">
              <h1 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{reportTitle}</h1>
              <p className="text-2xs text-zinc-500">{reportSub}</p>
            </div>

            {customCalculationsNode}

            {/* Content table for standard ledger flows */}
            {reportType === "all_operations" ? (
              <div className="space-y-8 print:space-y-6">
                
                {/* 1. REPORT CARD BANNER */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-right">
                  <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/60 block">
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold">{locale === "ar" ? "📈 إجمالي المداخيل والاشتراكات" : "Total Recettes"}</p>
                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">{formatTND(totalIncome, locale)}</p>
                    <p className="text-3xs text-zinc-400 dark:text-zinc-500 mt-1">
                      {locale === "ar" ? `موزعة على ${activeIncomes.length} عملية إيداع` : `${activeIncomes.length} versements`}
                    </p>
                  </div>
                  <div className="p-3.5 bg-rose-50/40 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/60 block">
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold">{locale === "ar" ? "💸 إجمالي المصاريف المعتمدة" : "Total Dépenses"}</p>
                    <p className="text-lg font-black text-rose-700 dark:text-rose-400 mt-1">{formatTND(totalExpense, locale)}</p>
                    <p className="text-3xs text-zinc-400 dark:text-zinc-500 mt-1">
                      {locale === "ar" ? `موزعة على ${activeApprovedExp.length} عملية صرف` : `${activeApprovedExp.length} dépenses`}
                    </p>
                  </div>
                  <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/60 block">
                    <p className="text-zinc-500 dark:text-zinc-400 font-bold">{locale === "ar" ? "💰 صافي رصيد الصندوق" : "Solde de Caisse"}</p>
                    <p className="text-lg font-black text-amber-800 dark:text-amber-400 mt-1">{formatTND(currentBalance, locale)}</p>
                    <span className={`inline-block px-2 py-0.5 mt-1 rounded text-3xs font-black ${currentBalance >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                      {currentBalance >= 0 
                        ? (locale === "ar" ? "حالة الرصيد: فائض إيجابي ✓" : "Excédent de caisse") 
                        : (locale === "ar" ? "حالة الرصيد: عجز سلبي ⚠️" : "Trésorerie déficitaire")}
                    </span>
                  </div>
                </div>

                {/* 2. CHRONOLOGICAL ALL OPERATIONS TABLE */}
                <div className="space-y-3 text-xs block">
                  <h4 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 border-r-4 border-emerald-800 pr-2 block">
                    {locale === "ar" ? "🗓️ سجل حركات الصندوق التاريخي الشامل (مداخيل ومصاريف مرتبة بالتواريخ)" : "Journal chronologique unifié de caisse"}
                  </h4>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-7">#</th>
                          <th className="px-3 py-2.5">{locale === "ar" ? "التاريخ" : "Date"}</th>
                          <th className="px-3 py-2.5">{locale === "ar" ? "النوع" : "Flux"}</th>
                          <th className="px-3 py-2.5 text-center">{locale === "ar" ? "رمز الإثبات/الفاتورة" : "Ref / Code unique"}</th>
                          <th className="px-3 py-2.5">{locale === "ar" ? "المستلم/الدافع (الطرف الثاني)" : "Tiers"}</th>
                          <th className="px-3 py-2.5">{locale === "ar" ? "البند المحاسبي" : "Rubrique"}</th>
                          <th className="px-3 py-2.5">{locale === "ar" ? "البيان والشرح" : "Libellé"}</th>
                          <th className="px-3 py-2.5 text-left">{locale === "ar" ? "المبلغ" : "Montant"}</th>
                          <th className="px-3 py-2.5 text-left bg-zinc-50/50 dark:bg-zinc-900/30">{locale === "ar" ? "الرصيد التراكمي" : "Solde Progressif"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {opsWithRunningBal.map((op, index) => (
                          <tr key={op.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                            <td className="px-3 py-2 text-center text-3xs font-mono text-zinc-400">{index + 1}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-zinc-650 dark:text-zinc-400 font-bold">{formatDate(op.date, locale)}</td>
                            <td className="px-3 py-2 whitespace-nowrap font-medium">
                              {op.type === "income" ? (
                                <span className="inline-block px-2 py-0.5 rounded text-4xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                                  🏠 {locale === "ar" ? "مدخول" : "Recette"}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-4xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
                                  💸 {locale === "ar" ? "مصروف" : "Dépense"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded text-3xs font-mono font-black bg-amber-55 text-amber-900 dark:bg-amber-950/30 dark:text-amber-350 border border-amber-200 dark:border-amber-900/40">
                                🏷️ {op.invoiceCode}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-black text-zinc-800 dark:text-zinc-200">{op.party}</td>
                            <td className="px-3 py-2 text-3xs font-bold text-zinc-500 dark:text-zinc-400">{op.category}</td>
                            <td className="px-3 py-2 text-3xs text-zinc-500 dark:text-zinc-400 font-normal max-w-xs truncate" title={op.description}>
                              {op.description}
                            </td>
                            <td className={`px-3 py-2 text-left font-black ${op.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-450"}`}>
                              {op.type === "income" ? "+" : "-"}{op.amount.toFixed(3)} DT
                            </td>
                            <td className="px-3 py-2 text-left font-mono font-bold text-slate-800 dark:text-slate-200 bg-zinc-50/30 dark:bg-zinc-900/10 whitespace-nowrap">
                              {op.runningBalance.toFixed(3)} DT
                            </td>
                          </tr>
                        ))}
                        {opsWithRunningBal.length === 0 && (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-zinc-400 font-bold">
                              {locale === "ar" ? "لا توجد أي معاملات بالصندوق حالياً." : "Aucune transaction enregistrée."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. FINAL BUDGET CATEGORIES BREAKDOWN (BUDGET PERFORMANCE REPORT) */}
                <div className="space-y-3 text-xs pt-4 border-t border-zinc-150 dark:border-zinc-850 block">
                  <h4 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 border-r-4 border-emerald-800 pr-2 block">
                    {locale === "ar" ? "📊 تفصيل توزيع الأرصدة وتقييم ميزانيات بنود الصرف المقررة" : "Évaluation analytique des écarts budgétaires"}
                  </h4>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 dark:text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-3 py-2.5">{locale === "ar" ? "بند الصرف والمذكرة" : "Rubrique budgétaire"}</th>
                          <th className="px-3 py-2.5 text-center">{locale === "ar" ? "المخصص المقدر" : "Allocation prévisionnelle"}</th>
                          <th className="px-3 py-2.5 text-center">{locale === "ar" ? "المنفق الفعلي وثروته" : "Consommation effective"}</th>
                          <th className="px-3 py-2.5 text-center">{locale === "ar" ? "منسوب التوزيع" : "Poids"}</th>
                          <th className="px-3 py-2.5 text-left">{locale === "ar" ? "الرصيد المتبقي للبند" : "Marge résiduelle"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {categories.map((cat) => {
                          const budgeted = campSetup.plannedBudgets[cat.code as ExpenseCategoryCode] || 0;
                          const spent = activeApprovedExp
                            .filter(e => e.category === cat.code)
                            .reduce((sum, e) => sum + e.amount, 0);
                          const diff = budgeted - spent;
                          const ratio = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
                          
                          return (
                            <tr key={cat.code} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                              <td className="px-3 py-2 font-bold text-zinc-850 dark:text-zinc-200">
                                <span className="ml-2 text-3xs">{cat.emoji}</span>
                                {locale === "ar" ? cat.labelAr : cat.labelFr}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-zinc-500 dark:text-zinc-400">{budgeted.toFixed(3)} DT</td>
                              <td className="px-3 py-2 text-center font-mono font-black text-rose-600 dark:text-rose-400">{spent.toFixed(3)} DT</td>
                              <td className="px-3 py-2 text-center text-3xs">
                                <div className="flex items-center justify-center gap-1.5 inline-flex">
                                  <div className="w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }}></div>
                                  </div>
                                  <span className="font-mono font-bold text-zinc-500 dark:text-zinc-400">{ratio.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className={`px-3 py-2 text-left font-mono font-bold ${diff >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                                {diff >= 0 ? "+" : ""}{diff.toFixed(3)} DT
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : reportType !== "scouts" ? (
          <div className="space-y-6">
            
            {/* INCOMES TABLE SECTION */}
            {(reportType === "ledger" || reportType === "daily") && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-xs text-emerald-800 border-r-4 border-emerald-800 pr-2">
                  {locale === "ar" ? "المداخيل والاشتراكات المقبوضة" : "Flux de Recettes"}
                </h4>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-right">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 font-bold border-b">
                      <tr>
                        <th className="px-3 py-2">{locale === "ar" ? "التاريخ" : "Date"}</th>
                        <th className="px-3 py-2">{locale === "ar" ? "الجهة الدافعة" : "Émetteur"}</th>
                        <th className="px-3 py-2">{locale === "ar" ? "طريقة الدفع" : "Mode"}</th>
                        <th className="px-3 py-2 text-left">{locale === "ar" ? "المبلغ" : "Montant"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {reportIncomes.map((inc) => (
                        <tr key={inc.id}>
                          <td className="px-3 py-2">{formatDate(inc.date, locale)}</td>
                          <td className="px-3 py-2 font-bold">{inc.payerName}</td>
                          <td className="px-3 py-2">{inc.method === "cash" ? "نقداً 💵" : "غير نقدي 🧾"}</td>
                          <td className="px-3 py-2 text-left font-black text-emerald-600">+{inc.amount.toFixed(3)}</td>
                        </tr>
                      ))}
                      {reportIncomes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-zinc-400">
                            {locale === "ar" ? "لا توجد حركات مداخيل في المدة المحددة" : "Aucune recette enregistrée."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXPENSES TABLE SECTION */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-xs text-rose-700 border-r-4 border-rose-700 pr-2">
                {locale === "ar" ? "المصاريف وفواتير الصرف المعتمدة" : "Flux de Dépenses"}
              </h4>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 font-bold border-b">
                    <tr>
                      <th className="px-3 py-2">{locale === "ar" ? "التاريخ" : "Date"}</th>
                      <th className="px-3 py-2">{locale === "ar" ? "المورد / الجهة" : "Fournisseur"}</th>
                      <th className="px-3 py-2">{locale === "ar" ? "البند" : "Poste"}</th>
                      <th className="px-3 py-2">{locale === "ar" ? "البيان والشرح" : "Détails"}</th>
                      <th className="px-3 py-2 text-left">{locale === "ar" ? "المبلغ" : "Montant"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {reportExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="px-3 py-2">{formatDate(exp.date, locale)}</td>
                        <td className="px-3 py-2 font-bold">{exp.supplier}</td>
                        <td className="px-3 py-2 bg-zinc-50/50 dark:bg-zinc-900/40">
                          {categories.find(c => c.code === exp.category)?.labelAr || exp.category}
                        </td>
                        <td className="px-3 py-2 text-zinc-500 font-normal">{exp.description}</td>
                        <td className="px-3 py-2 text-left font-black text-rose-600">-{exp.amount.toFixed(3)}</td>
                      </tr>
                    ))}
                    {reportExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-zinc-400">
                          {locale === "ar" ? "لا توجد مصاريف معتمدة في المدة المحددة" : "Aucun décaissement enregistré."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Balances summary footer on sheet */}
            <div className="pt-4 border-t-2 border-zinc-150 flex flex-wrap justify-between items-center text-xs font-bold gap-3">
              <div className="space-y-1 block">
                <p className="text-zinc-500">{locale === "ar" ? "الرصيد الكلي المتوفر حالياً بالصندوق" : "Total Cash Balance"}</p>
                <p className="text-lg font-black text-emerald-800 dark:text-emerald-400">{formatTND(currentBalance, locale)}</p>
              </div>

              <div className="flex gap-6 text-zinc-550">
                <div className="space-y-0.5 block">
                  <p>{locale === "ar" ? "المقبوضات :" : "Recettes :"}</p>
                  <p className="font-bold text-emerald-600">+{formatTND(totalIncome, locale)}</p>
                </div>
                <div className="space-y-0.5 block">
                  <p>{locale === "ar" ? "المدفوعات :" : "Dépenses :"}</p>
                  <p className="font-bold text-rose-600">-{formatTND(totalExpense, locale)}</p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* SCOUT PARTICIPANTS PAYMENTS REPORT SECTION */
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-xs text-amber-800 border-r-4 border-amber-800 pr-2">
              {locale === "ar" ? "قائمة تفصيلية بذمم الكشافة" : "Registre des cotisations scouts"}
            </h4>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 font-bold border-b">
                  <tr>
                    <th className="px-3 py-2">{locale === "ar" ? "الاسم" : "Nom complet"}</th>
                    <th className="px-3 py-2">{locale === "ar" ? "رقم القيد الكشفي" : "N° matricule"}</th>
                    <th className="px-3 py-2">{locale === "ar" ? "المدفوع" : "Payé"}</th>
                    <th className="px-3 py-2 text-left">{locale === "ar" ? "المتبقي بذمته" : "Reste à payer"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {scouts.map((scout) => {
                    const diff = campSetup.scoutFee - scout.amountPaid;
                    return (
                      <tr key={scout.id}>
                        <td className="px-3 py-2 font-bold">{scout.name}</td>
                        <td className="px-3 py-2 font-mono text-zinc-400">{scout.regNo}</td>
                        <td className="px-3 py-2 text-emerald-600 font-bold">{scout.amountPaid.toFixed(3)} TND</td>
                        <td className={`px-3 py-2 text-left font-black ${diff > 0 ? "text-rose-650" : "text-zinc-400"}`}>
                          {diff > 0 ? `${diff.toFixed(3)} TND` : (locale === "ar" ? "خلاص كامل سليم ✓" : "Payé ✓")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scout Signatures representation for print verification */}
        <div className="pt-8 grid grid-cols-2 gap-6 text-center text-3xs border-t-2 border-emerald-800 border-dashed">
          <div>
            <p className="text-zinc-450 font-bold mb-8">{locale === "ar" ? "إمضاء وتأشيرة أمين المال" : "Signature du Trésorier"}</p>
            <p className="font-mono text-zinc-400 dark:text-zinc-500 font-black">......................................</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold mb-8">{locale === "ar" ? "تأشيرة وموافقة قائد النشاط" : "Visa du Chef d'Activité"}</p>
            <p className="font-mono text-zinc-400 dark:text-zinc-500 font-black">......................................</p>
          </div>
        </div>

          </>
        )}

      </div>

    </div>
  );
}
