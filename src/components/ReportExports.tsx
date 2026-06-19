import React, { useState } from "react";
import { Expense, Income, Scout, CampSetup, ExpenseCategoryCode } from "../types";
import { formatTND, formatDate } from "../utils/helpers";
import { CATEGORIES_LIST } from "../initialData";
import { FileText, Printer, Download, Share2, Mail, Users, Calculator } from "lucide-react";

interface ReportExportsProps {
  expenses: Expense[];
  incomes: Income[];
  scouts: Scout[];
  campSetup: CampSetup;
  locale: "ar" | "fr";
  categories?: { code: string; labelAr: string; labelFr: string; emoji: string }[];
}

type ReportType = "daily" | "ledger" | "category" | "scouts" | "final";

export default function ReportExports({
  expenses,
  incomes,
  scouts,
  campSetup,
  locale,
  categories = CATEGORIES_LIST
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
    const costPerScout = scouts.length > 0 ? (totalExpense / scouts.length) : (totalExpense / campSetup.scoutCount);
    const dailyCost = totalExpense / 10; // estimate over 10 days

    customCalculationsNode = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-90 w-full p-2 rounded p-5 rounded-2xl border dark:border-zinc-800 text-xs font-medium text-right">
        <div>
          <p className="text-zinc-500 font-bold">{locale === "ar" ? "تكلفة الفرد الكلية (متوسط)" : "Coût par scout (Moyenne)"}</p>
          <p className="text-base font-black text-emerald-800 dark:text-emerald-400 mt-1">{formatTND(costPerScout, locale)}</p>
        </div>
        <div>
          <p className="text-zinc-500 font-bold">{locale === "ar" ? "متوسط التكلفة اليومية للمخيم" : "Coût journalier théorique"}</p>
          <p className="text-base font-black text-zinc-800 dark:text-zinc-200 mt-1">{formatTND(dailyCost, locale)}</p>
        </div>
        <div>
          <p className="text-zinc-500 font-bold">{locale === "ar" ? "صافي الوفورات / الفائض الكلي" : "Excédent de caisse"}</p>
          <p className="text-base font-black text-emerald-800 dark:text-emerald-400 mt-1">{formatTND(currentBalance, locale)}</p>
        </div>
      </div>
    );
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
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-3xs flex flex-wrap justify-between items-center gap-4">
        
        {/* Report configuration segments */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-lg px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-emerald-800"
          >
            <option value="final">{locale === "ar" ? "📋 التقرير الختامي الشامل" : "Rapport final de clôture"}</option>
            <option value="ledger">{locale === "ar" ? "📖 كشف الحساب العام" : "Grand livre général"}</option>
            <option value="daily">{locale === "ar" ? "📅 تقرير مالي يومي" : "Rapport journalier"}</option>
            <option value="category">{locale === "ar" ? "🍞 تقرير بند ميزانية محدد" : "Rapport analytique"}</option>
            <option value="scouts">{locale === "ar" ? "🧍 كشف دفع المشاركين" : "Paiements des scouts"}</option>
          </select>

          {/* Sub controllers */}
          {reportType === "daily" && (
            <input 
              type="date"
              className="text-xs font-bold border rounded-lg px-3 py-1.5 bg-zinc-50 text-zinc-800 focus:outline-emerald-800"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          )}

          {reportType === "category" && (
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ExpenseCategoryCode)}
              className="text-xs font-bold border rounded-lg px-3 py-1.5 bg-zinc-50 text-zinc-800 focus:outline-emerald-800"
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
        <div className="flex gap-2.5">
          <button 
            onClick={handlePrint}
            className="bg-emerald-800 hover:bg-emerald-700 text-white text-3xs font-black uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
            title="طباعة التقرير أو كراسة الصندوق"
          >
            <Printer className="w-4 h-4" />
            <span>{locale === "ar" ? "طباعة / حفظ PDF" : "Imprimer PDF"}</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-3xs font-black uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>{locale === "ar" ? "تصدير Excel" : "Excel (CSV)"}</span>
          </button>

          <button 
            onClick={handleWhatsAppShare}
            className="bg-[#25D366] text-white hover:bg-emerald-600 text-3xs font-black px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Share2 className="w-4 h-4" />
            <span>{locale === "ar" ? "مشاركة القيادة" : "Partager"}</span>
          </button>
        </div>

      </div>

      {/* 🧾 Document Report Box (Styled beautifully for printable rendering) */}
      <div className="bg-white dark:bg-zinc-1000 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-8 shadow-sm space-y-6 text-right relative printable-area text-zinc-800 dark:text-zinc-200">
        
        {/* Printable styled header */}
        <div className="border-b-2 border-emerald-800 pb-5 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right">
          <div className="space-y-1 block sm:order-last">
            <h2 className="font-black text-lg text-emerald-850 dark:text-emerald-400">{campSetup.campName || "الفوج الكشفي"}</h2>
            <p className="text-3xs text-zinc-400 font-bold uppercase tracking-wider">المنظمة الكشفية التونسية © 2026</p>
            <p className="text-3xs text-zinc-550 font-bold">{campSetup.campName}</p>
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
        {reportType !== "scouts" ? (
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
        <div className="pt-8 grid grid-cols-2 md:grid-cols-3 gap-6 text-center text-3xs border-t-2 border-emerald-800 border-dashed">
          <div>
            <p className="text-zinc-450 font-bold mb-8">{locale === "ar" ? "إمضاء وتأشيرة أمين المال" : "Signature du Trésorier"}</p>
            <p className="font-mono text-zinc-400 dark:text-zinc-500 font-black">......................................</p>
          </div>
          <div>
            <p className="text-zinc-400 font-bold mb-8">{locale === "ar" ? "تأشيرة وموافقة قائد الفوج" : "Visa du Chef de Groupe"}</p>
            <p className="font-mono text-zinc-400 dark:text-zinc-500 font-black">......................................</p>
          </div>
          <div className="hidden md:block">
            <p className="text-zinc-400 font-bold mb-8">{locale === "ar" ? "تأشيرة مراجع الحسابات الخارجي" : "Visa de l'Auditeur Externe"}</p>
            <p className="font-mono text-zinc-400 dark:text-zinc-500 font-black">......................................</p>
          </div>
        </div>

      </div>

    </div>
  );
}
