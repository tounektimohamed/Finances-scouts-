import React from "react";
import { Expense, CampSetup, ExpenseCategoryCode } from "../types";
import { formatTND } from "../utils/helpers";
import { CATEGORIES_LIST } from "../initialData";
import { Check, AlertTriangle, HelpCircle, ArrowUpRight } from "lucide-react";

interface BudgetComparisonProps {
  expenses: Expense[];
  campSetup: CampSetup;
  locale: "ar" | "fr";
  categories?: { code: string; labelAr: string; labelFr: string; emoji: string }[];
}

export default function BudgetComparison({
  expenses,
  campSetup,
  locale,
  categories = CATEGORIES_LIST
}: BudgetComparisonProps) {
  
  // Only count approved & active expenses for actual budget consumption
  const activeApprovedExp = expenses.filter(e => !e.isCancelled && e.status === "approved");

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-3xs">
        <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200 border-b pb-2 dark:border-zinc-850">
          {locale === "ar" ? "تفاصيل مقارنة الموازنة والانحراف المالي" : "Suivi approfondi des marges budgétaires"}
        </h3>
        <p className="text-2xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
          {locale === "ar" 
            ? `يوفر هذا الكشف مقارنة دقيقة ومحدثة لحظياً لكل بند كشفي ممهد لتقدير الانحرافات والوفورات في ميزانية مخيم ${campSetup.campName || "الفوج الكشفي"}.`
            : "Ce module dresse le comparatif analytique entre les prévisions de l'intendance et l'exécution réelle des dépenses."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const planned = campSetup.plannedBudgets[cat.code] || 0;
          const items = activeApprovedExp.filter(e => e.category === cat.code);
          const totalSpent = items.reduce((acc, curr) => acc + curr.amount, 0);
          const remaining = planned - totalSpent;
          const isOver = totalSpent > planned;
          const isNear = totalSpent >= planned * 0.8 && totalSpent <= planned;
          const pct = planned > 0 ? (totalSpent / planned) * 100 : 0;

          return (
            <div 
              key={cat.code} 
              className={`bg-white dark:bg-zinc-950 p-5 rounded-2xl border transition-shadow hover:shadow-2xs ${
                isOver 
                  ? "border-rose-200 dark:border-rose-950" 
                  : isNear 
                    ? "border-amber-200 dark:border-amber-950" 
                    : "border-zinc-150 dark:border-zinc-855"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.emoji}</span>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {locale === "ar" ? cat.labelAr : cat.labelFr}
                    </h4>
                    <p className="text-3xs text-zinc-400">
                      {items.length} {locale === "ar" ? "عمليات معتمدة" : "dépenses approuvées"}
                    </p>
                  </div>
                </div>

                <div className="text-left block">
                  <span className={`text-3xs font-extrabold px-2 py-0.5 rounded-full ${
                    isOver 
                      ? "bg-rose-100 text-rose-800" 
                      : isNear 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Progress visual bar */}
              <div className="mt-4 relative w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOver 
                      ? "bg-rose-600" 
                      : isNear 
                        ? "bg-amber-500" 
                        : "bg-emerald-600"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>

              {/* Values grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-3xs pt-3 border-t dark:border-zinc-900">
                <div className="block">
                  <p className="text-zinc-400 font-bold">{locale === "ar" ? "المخطط" : "Prévu"}</p>
                  <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {formatTND(planned, locale)}
                  </p>
                </div>
                <div className="block">
                  <p className="text-zinc-400 font-bold">{locale === "ar" ? "المنفق" : "Consommé"}</p>
                  <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {formatTND(totalSpent, locale)}
                  </p>
                </div>
                <div className="block text-left">
                  <p className="text-zinc-400 font-bold">
                    {isOver 
                      ? (locale === "ar" ? "العجز 🔴" : "Déficit 🔴") 
                      : (locale === "ar" ? "المتبقي 🍏" : "Reste 🍏")}
                  </p>
                  <p className={`text-xs font-black mt-0.5 ${isOver ? "text-rose-600" : "text-emerald-700"}`}>
                    {formatTND(Math.abs(remaining), locale)}
                  </p>
                </div>
              </div>

              {/* Collapsible itemized invoices for this specific category */}
              {items.length > 0 && (
                <div className="mt-4 pt-3 border-t dark:border-zinc-900 space-y-2 block">
                  <p className="text-3xs font-extrabold text-zinc-400 uppercase tracking-wider mb-2">
                    {locale === "ar" ? "وصولات هذا البند" : "Justificatifs de cette rubrique"}
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                    {items.map((it) => (
                      <div key={it.id} className="flex justify-between items-center text-3xs font-medium">
                        <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]" title={it.description}>
                          • {it.supplier} ({it.description})
                        </span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {formatTND(it.amount, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
