import React, { useState } from "react";
import { Expense, Income, User, ExpenseCategoryCode, IncomeType } from "../types";
import { formatTND, formatDate } from "../utils/helpers";
import { CATEGORIES_LIST } from "../initialData";
import { Search, Filter, AlertCircle, XCircle, CheckCircle, FileText, Camera } from "lucide-react";

interface TransactionsListProps {
  expenses: Expense[];
  incomes: Income[];
  currentUser: User;
  locale: "ar" | "fr";
  onCancelExpense: (id: string, reason: string) => void;
  onCancelIncome: (id: string, reason: string) => void;
  onApproveExpense: (id: string) => void;
  categories?: { code: string; labelAr: string; labelFr: string; emoji: string }[];
  onViewReceipt?: (income: Income) => void;
}

export default function TransactionsList({
  expenses,
  incomes,
  currentUser,
  locale,
  onCancelExpense,
  onCancelIncome,
  onApproveExpense,
  categories = CATEGORIES_LIST,
  onViewReceipt
}: TransactionsListProps) {
  const [filterType, setFilterType] = useState<"all" | "incomes" | "expenses">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedInvoiceImg, setSelectedInvoiceImg] = useState<string | null>(null);
  
  // Auditing & cancelling popover state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingType, setCancellingType] = useState<"expense" | "income" | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const isTreasurer = currentUser.role === "treasurer";
  const isLeader = currentUser.role === "leader";

  // Combine actions for sorting
  const combined = [
    ...incomes.map(i => ({ ...i, listType: "income" as const })),
    ...expenses.map(e => ({ ...e, listType: "expense" as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter list
  const filtered = combined.filter(item => {
    // 1. Type Filter
    if (filterType === "incomes" && item.listType !== "income") return false;
    if (filterType === "expenses" && item.listType !== "expense") return false;

    // 2. Category / Subtype Filter
    if (filterCategory !== "all") {
      if (item.listType === "expense" && (item as Expense).category !== filterCategory) return false;
      if (item.listType === "income" && (item as Income).type !== filterCategory) return false;
    }

    // 3. Search query (Payer name, supplier description, notes, registrado)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const txt = item.listType === "income" 
        ? `${(item as Income).payerName} ${(item as Income).note || ""} ${(item as Income).receiptNo}`.toLowerCase()
        : `${(item as Expense).supplier} ${(item as Expense).description} ${(item as Expense).note || ""}`.toLowerCase();
      if (!txt.includes(q)) return false;
    }

    return true;
  });

  const triggerCancel = (id: string, type: "expense" | "income") => {
    setCancellingId(id);
    setCancellingType(type);
    setCancelReason("");
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) return;
    if (cancellingType === "expense" && cancellingId) {
      onCancelExpense(cancellingId, cancelReason);
    } else if (cancellingType === "income" && cancellingId) {
      onCancelIncome(cancellingId, cancelReason);
    }
    setCancellingId(null);
    setCancellingType(null);
    setCancelReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-100 dark:border-zinc-850 shadow-3xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4 ml-1" />
          </span>
          <input 
            type="text"
            className="w-full pr-9 pl-3 py-2 text-xs border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-800"
            placeholder={locale === "ar" ? "ابحث عن واصل أو مورد أو جهة تسليم..." : "Rechercher un reçu, fournisseur, motif..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap gap-2.5">
          {/* Main type Filter */}
          <div className="flex border border-zinc-250 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900 p-0.5">
            <button 
              onClick={() => { setFilterType("all"); setFilterCategory("all"); }}
              className={`px-3 py-1.5 rounded-md text-3xs font-bold transition ${filterType === "all" ? "bg-emerald-800 text-white" : "text-zinc-650 dark:text-zinc-300"}`}
            >
              {locale === "ar" ? "الكل" : "Tous"}
            </button>
            <button 
              onClick={() => { setFilterType("incomes"); setFilterCategory("all"); }}
              className={`px-3 py-1.5 rounded-md text-3xs font-bold transition ${filterType === "incomes" ? "bg-emerald-800 text-white" : "text-zinc-650 dark:text-zinc-300"}`}
            >
              {locale === "ar" ? "المداخيل" : "Entrées"}
            </button>
            <button 
              onClick={() => { setFilterType("expenses"); setFilterCategory("all"); }}
              className={`px-3 py-1.5 rounded-md text-3xs font-bold transition ${filterType === "expenses" ? "bg-emerald-800 text-white" : "text-zinc-650 dark:text-zinc-300"}`}
            >
              {locale === "ar" ? "المصاريف" : "Dépenses"}
            </button>
          </div>

          {/* Category Filter */}
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-3xs font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 rounded-lg px-2.5 py-1.5 dark:text-zinc-200 focus:outline-emerald-800"
          >
            <option value="all">
              {locale === "ar" ? "كل البنود / التصنيفات" : "Toutes rubriques"}
            </option>
            {filterType !== "incomes" && categories.map(cat => (
              <option key={cat.code} value={cat.code}>
                {locale === "ar" ? cat.labelAr : cat.labelFr}
              </option>
            ))}
            {filterType !== "expenses" && (
              <>
                <option value="participation">{locale === "ar" ? "معلوم مشاركة 🧍" : "Frais de participation"}</option>
                <option value="grant">{locale === "ar" ? "منح دعم 📑" : "Subventions"}</option>
                <option value="donation">{locale === "ar" ? "تبرع أفراد 🤝" : "Dons"}</option>
                <option value="activity">{locale === "ar" ? "أنشطة وعائدات 🥯" : "Ventes scouts"}</option>
              </>
            )}
          </select>
        </div>

      </div>

      {/* 🛑 Confirm Cancellation Popover */}
      {cancellingId && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/40 p-4 rounded-xl space-y-3">
          <div className="flex gap-2 items-start text-xs text-rose-800 dark:text-rose-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold">
                {locale === "ar" ? "إلغاء العملية المسجلة (ممر التدقيق المالي)" : "Annuler la transaction (Audit Trail)"}
              </p>
              <p className="text-2xs text-rose-700 dark:text-rose-300 mt-1">
                {locale === "ar" 
                  ? "قواعد العمل: لا يمكن حذف أي عملية مالية مسجلة مطلقاً لسلامة الصندوق القيادي. يتوجب عليك تسجيل سبب الإلغاء بدقة."
                  : "Règle de comptabilité : Aucune suppression physique n'est permise. Justifiez l'arrêt du flux financier."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900 font-medium text-xs rounded-lg px-3 py-2 text-rose-900 dark:text-rose-100 placeholder-rose-400 focus:outline-rose-600"
              placeholder={locale === "ar" ? "ما هو سبب إلغاء هذه الفاتورة أو الإيداع بقيمة الصندوق؟" : "Indiquez la raison de l'annulation..."}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <button 
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs px-4 py-2 font-bold rounded-lg transition"
            >
              {locale === "ar" ? "تأكيد الإلغاء" : "Confirmer"}
            </button>
            <button 
              onClick={() => { setCancellingId(null); setCancellingType(null); }}
              className="bg-zinc-200 text-zinc-700 hover:bg-zinc-300 text-xs px-3 py-2 rounded-lg font-bold transition"
            >
              {locale === "ar" ? "تراجع" : "Annuler"}
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table/List */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-855 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-850 flex justify-between items-center">
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            {locale === "ar" ? "كشف الدفتر المالي للمخيم" : "Détails du grand livre"}
          </h3>
          <span className="text-2xs text-zinc-500 bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 px-2.5 py-1 rounded-full font-bold">
            {filtered.length} {locale === "ar" ? "سجلات مطابقة" : "enregistrements"}
          </span>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-right text-zinc-700 dark:text-zinc-300">
            <thead className="text-3xs uppercase bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-bold border-b dark:border-zinc-850">
              <tr>
                <th className="px-4 py-3">{locale === "ar" ? "العملية والجهة" : "Type / Payer-Founisseur"}</th>
                <th className="px-4 py-3">{locale === "ar" ? "التاريخ والساعة" : "Date"}</th>
                <th className="px-4 py-3">{locale === "ar" ? "البند الكشفي" : "Rubrique"}</th>
                <th className="px-4 py-3">{locale === "ar" ? "طريقة الدفع" : "Mode"}</th>
                <th className="px-4 py-3">{locale === "ar" ? "الفاتورة" : "Justificatif"}</th>
                <th className="px-4 py-3">{locale === "ar" ? "المبلّغ والمدخل" : "Enregistré par"}</th>
                <th className="px-4 py-3 text-left">{locale === "ar" ? "المبلغ بالدينار" : "Montant"}</th>
                <th className="px-4 py-3 text-center">{locale === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {filtered.map((item, idx) => {
                const isInc = item.listType === "income";
                const isCancelled = item.isCancelled;
                
                // Expense status variables
                let isPendingApproval = false;
                let isBelowLimit = true;
                if (!isInc) {
                  const exp = item as Expense;
                  isPendingApproval = exp.status === "pending_approval";
                }

                const catLabel = isInc 
                  ? (locale === "ar" ? "مداخيل 💰" : "Recette 💰")
                  : categories.find(c => c.code === (item as Expense).category)?.labelAr || "متفرقات 🔧";

                return (
                  <tr key={idx} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors ${isCancelled ? "bg-rose-50/20 opacity-60 line-through" : ""}`}>
                    
                    {/* Item title / Name */}
                    <td className="px-4 py-3.5 font-bold">
                      <div className="flex flex-col">
                        <span className="text-zinc-900 dark:text-zinc-100">
                          {isInc ? (item as Income).payerName : (item as Expense).supplier}
                        </span>
                        <span className="text-3xs font-medium text-zinc-400 mt-0.5 line-clamp-1 max-w-[200px]">
                          {isInc ? (item as Income).note : (item as Expense).description}
                        </span>
                        {isCancelled && (
                          <span className="text-3xs text-rose-600 font-bold bg-rose-100/60 dark:bg-rose-950/40 px-2 py-0.5 rounded-sm mt-1 w-max">
                            {locale === "ar" ? `ملغى: ${item.cancelReason}` : `Annulé: ${item.cancelReason}`}
                          </span>
                        )}
                        {!isInc && (item as Expense).invoiceStatus === "missing" && (item as Expense).amount > 50 && (
                          <span className="text-3xs font-medium text-amber-600 bg-amber-50 dark:bg-zinc-900 border border-amber-200 px-1 py-0.5 mt-1 rounded w-max">
                            {locale === "ar" ? "⚠️ مفقود الفاتورة" : "Alerte Justificatif"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-zinc-500 whitespace-nowrap">
                      {formatDate(item.date, locale)}
                    </td>

                    {/* Category Label */}
                    <td className="px-4 py-3.5">
                      <span className="bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-2xs font-extrabold text-zinc-650 dark:text-zinc-300">
                        {catLabel}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-3.5 text-zinc-500 font-medium">
                      {isInc 
                        ? (item as Income).method === "cash" ? "نقداً 💵" : (item as Income).method === "cheque" ? "شيك 🧾" : "تحويل 🏦"
                        : "نقداً 💵"}
                    </td>

                    {/* Receipt/Invoice preview */}
                    <td className="px-4 py-3.5">
                      {isInc ? (
                        <div className="flex items-center gap-1.5 justify-start">
                          <span className="text-3xs text-zinc-400 font-mono">{(item as Income).receiptNo}</span>
                          <button
                            onClick={() => onViewReceipt && onViewReceipt(item as Income)}
                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-150 rounded text-3xs font-bold px-1.5 py-0.5 cursor-pointer leading-tight"
                            title={locale === "ar" ? "عرض / طباعة / مشاركة الوصل الرسمي" : "Voir/Imprimer"}
                          >
                            وصل 📄
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {/* Invoice indicator */}
                          <span className={`text-3xs px-1.5 py-0.5 rounded font-bold ${
                            (item as Expense).invoiceStatus === "existing" 
                              ? "bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-300" 
                              : (item as Expense).invoiceStatus === "way" 
                                ? "bg-amber-100 text-amber-850" 
                                : "bg-rose-100 text-rose-850"
                          }`}>
                            {(item as Expense).invoiceStatus === "existing" 
                              ? (locale === "ar" ? "موجودة" : "Présent") 
                              : (item as Expense).invoiceStatus === "way" 
                                ? (locale === "ar" ? "في الطريق" : "En cours") 
                                : (locale === "ar" ? "مفقودة" : "Manquant")}
                          </span>
                          {(item as Expense).invoiceImage && (
                            <button 
                              onClick={() => setSelectedInvoiceImg((item as Expense).invoiceImage || null)}
                              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 p-0.5 rounded"
                              title="عرض الفاتورة"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Registrant */}
                    <td className="px-4 py-3.5 text-zinc-500 truncate max-w-[125px]">
                      {item.registeredBy}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 text-left font-extrabold">
                      <span className={isInc ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {isInc ? "+" : "-"}{formatTND(item.amount, locale)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center gap-1.5">
                        
                        {/* Leadership approval check */}
                        {isLeader && isPendingApproval && !isCancelled && (
                          <button 
                            onClick={() => onApproveExpense(item.id)}
                            className="bg-amber-500 hover:bg-amber-600 border border-amber-600 text-amber-950 text-3xs font-extrabold px-2 py-1 rounded transition shrink-0"
                          >
                            {locale === "ar" ? "موافق بقبول الصرف" : "Valider"}
                          </button>
                        )}

                        {/* Approved feedback banner */}
                        {!isInc && (item as Expense).status === "approved" && (
                          <span className="text-3xs text-emerald-600 flex items-center gap-0.5" title="معتمد من القيادة">
                            <CheckCircle className="w-3.5 h-3.5 inline" />
                          </span>
                        )}

                        {/* Pending approval indicator banner */}
                        {!isInc && isPendingApproval && !isLeader && (
                          <span className="text-3xs text-amber-600 font-bold bg-amber-55 text-center px-1 py-0.5 rounded animate-pulse select-none">
                            {locale === "ar" ? "انتظار القيادة" : "En attente"}
                          </span>
                        )}

                        {/* Treasurer cancellation with audit reasoning */}
                        {isTreasurer && !isCancelled && (
                          <button 
                            onClick={() => triggerCancel(item.id, isInc ? "income" : "expense")}
                            className="text-rose-500 hover:text-rose-700 dark:text-rose-450 p-1 hover:bg-rose-50 dark:hover:bg-rose-955 rounded transition"
                            title={locale === "ar" ? "إلغاء العملية" : "Annuler"}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
                    {locale === "ar" ? "لم نجد أي عمليات حسابية مسجلة تطابق مرشحات البحث الحالية." : "Aucun mouvement financier correspondant."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="md:hidden divide-y divide-zinc-150 dark:divide-zinc-850">
          {filtered.map((item, idx) => {
            const isInc = item.listType === "income";
            const isCancelled = item.isCancelled;
            const keyLabel = isInc ? "income" : (item as Expense).category;
            const categoryObj = categories.find(c => c.code === keyLabel);
            
            return (
              <div 
                key={idx} 
                className={`p-4 space-y-2.5 text-xs transition-colors ${
                  isCancelled ? "bg-rose-50/10 opacity-70 line-through" : ""
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
                      {isInc ? (item as Income).payerName : (item as Expense).supplier}
                    </p>
                    <p className="text-2xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {isInc ? (item as Income).note : (item as Expense).description}
                    </p>
                  </div>
                  <div className={`font-black text-sm shrink-0 ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                    {isInc ? "+" : "-"}{formatTND(item.amount, locale)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-2xs gap-y-1 bg-zinc-50 dark:bg-zinc-90 w-full p-2 rounded">
                  <div className="space-y-1 block text-zinc-500 dark:text-zinc-400">
                    <div>{formatDate(item.date, locale)}</div>
                    <div>{locale === "ar" ? "بواسطة" : "Par"} : {item.registeredBy}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="bg-zinc-200 dark:bg-zinc-800 font-bold px-1.5 py-0.5 rounded text-3xs text-zinc-650 dark:text-zinc-300">
                      {isInc ? (locale === "ar" ? "مداخيل 💰" : "Recette") : (categoryObj?.labelAr || "مصروف 💸")}
                    </span>
                    {!isInc && (
                      <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded ${
                        (item as Expense).invoiceStatus === "existing" ? "bg-emerald-100 text-emerald-850" : "bg-rose-100 text-rose-850"
                      }`}>
                        {(item as Expense).invoiceStatus === "existing" ? (locale === "ar" ? "فاتورة" : "Facture") : (locale === "ar" ? "بلا فاتورة" : "Sans doc")}
                      </span>
                    )}
                  </div>
                </div>

                {isCancelled && (
                  <div className="text-3xs text-rose-700 bg-rose-100/50 p-2 rounded border border-rose-200">
                    {locale === "ar" ? `سبب الإلغاء الشفاف: ${item.cancelReason}` : `Raison: ${item.cancelReason}`}
                  </div>
                )}

                {/* Mobile actions row */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t dark:border-zinc-900 border-zinc-100">
                  {isInc && !isCancelled && (
                    <button
                      onClick={() => onViewReceipt && onViewReceipt(item as Income)}
                      className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-extrabold text-3xs px-2 py-1 rounded border border-emerald-150 cursor-pointer mr-auto"
                    >
                      {locale === "ar" ? "طباعة ومشاركة الوصل 📄" : "Imprimer Reçu 📄"}
                    </button>
                  )}
                  {isLeader && !isInc && (item as Expense).status === "pending_approval" && !isCancelled && (
                    <button 
                      onClick={() => onApproveExpense(item.id)}
                      className="bg-amber-500 text-amber-950 font-bold text-3xs px-2.5 py-1 rounded"
                    >
                      {locale === "ar" ? "موافقة القيادة" : "Approuver"}
                    </button>
                  )}

                  {!isInc && (item as Expense).status === "approved" && (
                    <span className="text-3xs text-emerald-600 flex items-center gap-0.5 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {locale === "ar" ? "موافقة معتمدة" : "Approuvé"}
                    </span>
                  )}

                  {isTreasurer && !isCancelled && (
                    <button 
                      onClick={() => triggerCancel(item.id, isInc ? "income" : "expense")}
                      className="text-rose-600 hover:bg-rose-50 px-2 py-1 rounded text-3xs font-bold border border-rose-200"
                    >
                      {locale === "ar" ? "إلغاء العملية" : "Annuler"}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              {locale === "ar" ? "لا توجد عمليات" : "Aucun mouvement financier."}
            </div>
          )}
        </div>

      </div>

      {/* Invoice Image Full Lightbox modal */}
      {selectedInvoiceImg && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl max-w-lg w-full relative">
            <button 
              onClick={() => setSelectedInvoiceImg(null)}
              className="absolute top-2 left-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 w-8 h-8 rounded-full font-bold flex items-center justify-center"
            >
              ✕
            </button>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-150 mb-3 text-right">
              {locale === "ar" ? "معاينة الوثيقة المرفقة / الفاتورة الصرفة" : "Visualisation du justificatif join"}
            </h3>
            <div className="h-80 w-full overflow-hidden flex items-center justify-center border rounded-lg bg-zinc-50 dark:bg-zinc-950">
              <img 
                src={selectedInvoiceImg} 
                className="max-h-full max-w-full object-contain" 
                alt="Receipt screenshot"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
