import React, { useState } from "react";
import { Scout, User, CampSetup, Income } from "../types";
import { formatTND, formatDate } from "../utils/helpers";
import { PlusCircle, Search, UserCheck, Check, DollarSign, Upload, Users, Award } from "lucide-react";

interface ScoutManagerProps {
  scouts: Scout[];
  campSetup: CampSetup;
  currentUser: User;
  locale: "ar" | "fr";
  onAddScout: (name: string, regNo: string, amountPaid: number) => void;
  onRecordPayment: (scoutId: string, amount: number, method: "cash" | "cheque" | "transfer", note?: string) => void;
  onBulkLoadScouts: (scoutsList: { name: string; regNo: string; amountPaid: number }[]) => void;
  incomes?: Income[];
  onViewReceipt?: (income: Income) => void;
}

export default function ScoutManager({
  scouts,
  campSetup,
  currentUser,
  locale,
  onAddScout,
  onRecordPayment,
  onBulkLoadScouts,
  incomes = [],
  onViewReceipt
}: ScoutManagerProps) {
  
  const [search, setSearch] = useState("");
  
  // Single Scout Addition Form
  const [newScoutName, setNewScoutName] = useState("");
  const [newScoutReg, setNewScoutReg] = useState("");
  const [initPayment, setInitPayment] = useState<number>(0);

  // Partial Payment Modal popup
  const [paymentScoutId, setPaymentScoutId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number>(campSetup.scoutFee);
  const [payMethod, setPayMethod] = useState<"cash" | "cheque" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");

  // Bulk Excel import visualization simulation
  const [inputBulkText, setInputBulkText] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  const isTreasurer = currentUser.role === "treasurer";
  const canModify = currentUser.role === "treasurer" || currentUser.role === "leader";

  // Calculate numbers
  const fee = campSetup.scoutFee;
  const totalDueSum = scouts.length * fee;
  const totalCollectedSum = scouts.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const remainingCollectedSum = totalDueSum - totalCollectedSum;

  const filteredScouts = scouts.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q);
  });

  const handleAddScoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScoutName.trim() || !newScoutReg.trim()) return;
    onAddScout(newScoutName, newScoutReg, initPayment);
    setNewScoutName("");
    setNewScoutReg("");
    setInitPayment(0);
  };

  const handleRecordPaymentSubmit = () => {
    if (!paymentScoutId) return;
    onRecordPayment(paymentScoutId, payAmount, payMethod, payNote);
    setPaymentScoutId(null);
    setPayNote("");
  };

  const fillExampleTemplate = () => {
    const exampleValue = 
      `${locale === "ar" ? "منذر العياشي" : "Monther Layachi"},K-011/26,60\n` +
      `${locale === "ar" ? "رحمة الذوادي" : "Rahma Zouadi"},K-012/26,60\n` +
      `${locale === "ar" ? "فراس القروي" : "Firas Karoui"},K-013/26,30\n` +
      `${locale === "ar" ? "نهى النفاتي" : "Noha Neffati"},K-014/26,0\n` +
      `${locale === "ar" ? "أيمن الشاوش" : "Aymen Chaouech"},K-015/26,60`;
    setInputBulkText(exampleValue);
  };

  const handleBulkPasteImport = () => {
    if (!inputBulkText.trim()) return;
    // Basic CSV/TSV parser: Name,RegNo,Amount
    const lines = inputBulkText.split("\n");
    const parsedScouts: { name: string; regNo: string; amountPaid: number }[] = [];
    
    lines.forEach(line => {
      const parts = line.split(/[,\t]/);
      if (parts[0] && parts[0].trim()) {
        const name = parts[0].trim();
        const regNo = parts[1] ? parts[1].trim() : `K-${Math.floor(Math.random()*900 + 100)}`;
        const money = parts[2] ? parseFloat(parts[2].trim()) : 0;
        parsedScouts.push({
          name,
          regNo,
          amountPaid: isNaN(money) ? 0 : money
        });
      }
    });

    if (parsedScouts.length > 0) {
      onBulkLoadScouts(parsedScouts);
      setInputBulkText("");
      setShowBulkModal(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* 📊 Scout fees collection summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-850 shadow-3xs">
        <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl">
          <p className="text-3xs font-extrabold text-zinc-450 uppercase tracking-widest">
            {locale === "ar" ? "المبلغ الجملي المطلوب لسيناريو معلوم المشاركة" : "Montant total attendu"}
          </p>
          <h4 className="text-xl font-black text-amber-900 dark:text-amber-100">{formatTND(totalDueSum, locale)}</h4>
          <span className="text-3xs block text-zinc-400">
            {scouts.length} {locale === "ar" ? "مشارك × " : "scouts × "} {fee} TND
          </span>
        </div>

        <div className="space-y-1 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200 p-4 rounded-xl">
          <p className="text-3xs font-extrabold text-emerald-700/80 uppercase tracking-widest">
            {locale === "ar" ? "المبالغ المحصلة والمقبوضة فعلاً" : "Montant encaissé"}
          </p>
          <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-400">{formatTND(totalCollectedSum, locale)}</h4>
          <span className="text-3xs block text-emerald-600">
            {locale === "ar" ? `نسبة التحصيل: ${((totalCollectedSum / (totalDueSum || 1)) * 100).toFixed(0)}%` : `Taux d'encaissement : ${((totalCollectedSum / (totalDueSum || 1)) * 100).toFixed(0)}%`}
          </span>
        </div>

        <div className="space-y-1 bg-rose-50 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200 p-4 rounded-xl">
          <p className="text-3xs font-extrabold text-rose-700/80 uppercase tracking-widest">
            {locale === "ar" ? "المستحقات المتبقية بذمة الكشافة" : "Reste à recouvrer"}
          </p>
          <h4 className="text-xl font-black text-rose-700 dark:text-rose-455">{formatTND(remainingCollectedSum, locale)}</h4>
          <span className="text-3xs block text-rose-500">
            {scouts.filter(s => s.amountPaid < fee).length} {locale === "ar" ? "كشاف بذمتهم ديون" : "scouts avec solde partiel/dû"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Add single scout / bulk controls */}
        {canModify && (
          <div className="lg:col-span-1 space-y-6 block">
            
            {/* Form addition */}
            <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-855 shadow-3xs space-y-4">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b pb-2 dark:border-zinc-850">
                <Users className="w-4.5 h-4.5 text-emerald-800" />
                <span>{locale === "ar" ? "إدخال كشاف فردي يدوي" : "Enregistrer un scout"}</span>
              </h3>
              
              <form onSubmit={handleAddScoutSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-3xs font-extrabold text-zinc-500 mb-1">
                    {locale === "ar" ? "اسم الكشاف بالكامل" : "Nom complet du scout"}
                  </label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-90 w-full p-2 rounded text-zinc-800 dark:text-zinc-250 focus:ring-1 focus:ring-emerald-800 focus:outline-none dark:border-zinc-800"
                    placeholder=""
                    value={newScoutName}
                    onChange={(e) => setNewScoutName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-3xs font-extrabold text-zinc-500 mb-1">
                    {locale === "ar" ? "رقم القيد / رقم الوصل الكشفي" : "N° matricule / d'inscription"}
                  </label>
                  <input 
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-90 w-full p-2 rounded text-zinc-800 dark:text-zinc-250 focus:ring-1 focus:ring-emerald-800 focus:outline-none dark:border-zinc-800"
                    placeholder="K-25/001"
                    value={newScoutReg}
                    onChange={(e) => setNewScoutReg(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-3xs font-extrabold text-zinc-500 mb-1">
                    {locale === "ar" ? "قيمة الدفعة الأولى عند التسجيل (د.ت)" : "Acompte initial versé (TND)"}
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max={fee}
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-90 w-full p-2 rounded text-zinc-800 dark:text-zinc-250 focus:ring-1 focus:ring-emerald-800 focus:outline-none dark:border-zinc-800"
                    value={initPayment || ""}
                    onChange={(e) => setInitPayment(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    {locale === "ar" ? `أقصى اشتراك محدد للمخيم حالياً: ${fee} د.ت` : `Frais max : ${fee} TND`}
                  </span>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition"
                >
                  {locale === "ar" ? "+ تسجيل الكشاف بالدفتر" : "Enregistrer"}
                </button>
              </form>
            </div>

            {/* Bulk Loading Trigger Panel */}
            <div className="bg-amber-50/50 dark:bg-zinc-900 border border-amber-200/50 dark:border-zinc-800 p-5 rounded-2xl shadow-3xs text-center space-y-3">
              <Upload className="w-8 h-8 text-amber-700 mx-auto" />
              <div className="space-y-1 block">
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-100">
                  {locale === "ar" ? "استيراد قائمة المشاركين (Excel / CSV)" : "Importation de liste d'enfants"}
                </h4>
                <p className="text-3xs text-zinc-500 leading-relaxed">
                  {locale === "ar" 
                    ? "وفر الوقت برفع ملف Excel الكشافة للمشاركين أو تعبئة القائمة التجريبية بضغطة زر واحدة."
                    : "Importez en lot avec un simple copier-coller de tableur ou générez notre lot de démonstration."}
                </p>
              </div>
              <button 
                onClick={() => setShowBulkModal(true)}
                className="bg-zinc-800 hover:bg-zinc-750 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-3xs font-extrabold px-3.5 py-2 rounded-lg transition"
              >
                {locale === "ar" ? "بدء استيراد القائمة الكشفية" : "Lancer l'importation"}
              </button>
            </div>

          </div>
        )}

        {/* Right column: Scout payment statuses tracking list */}
        <div className={`lg:col-span-${canModify ? "2" : "3"} space-y-4`}>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-855 p-5 rounded-2xl shadow-3xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b dark:border-zinc-850">
              <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">
                {locale === "ar" ? "قائمة دفعات الكشافة المشاركين" : "Suivi individuel des cotisations"}
              </h3>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input 
                  type="text"
                  placeholder={locale === "ar" ? "ابحث باسم الكشاف أو رقمه..." : "Filtrer par nom ou matricule..."}
                  className="bg-zinc-50 dark:bg-zinc-900 text-3xs rounded-lg px-2 text-zinc-800 dark:text-zinc-250 pr-8 py-1.5 border dark:border-zinc-800 focus:outline-emerald-800"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-3xs text-zinc-500 font-bold uppercase border-b dark:border-zinc-850">
                  <tr>
                    <th className="px-4 py-3">{locale === "ar" ? "الرقم التسلسلي" : "Matricule"}</th>
                    <th className="px-4 py-3">{locale === "ar" ? "الاسم" : "Nom complet"}</th>
                    <th className="px-4 py-3">{locale === "ar" ? "تاريخ الإدراج" : "Date entrée"}</th>
                    <th className="px-4 py-3">{locale === "ar" ? "حالة السداد" : "Statut"}</th>
                    <th className="px-4 py-3 text-left">{locale === "ar" ? "المدفوع / الجملي" : "Payé / Dû"}</th>
                    {isTreasurer && <th className="px-4 py-3 text-center">{locale === "ar" ? "تسجيل دفعة تكميلية" : "Paiement"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                  {filteredScouts.map((scout, index) => {
                    const isFullyPaid = scout.amountPaid >= fee;
                    const isUnpaid = scout.amountPaid === 0;
                    
                    let statusLabelAr = "سدد كلياً ✅";
                    let statusLabelFr = "Réglé ✅";
                    let statusStyle = "bg-emerald-100 text-emerald-850";
                    if (isUnpaid) {
                      statusLabelAr = "لم يسدد 🛑";
                      statusLabelFr = "Non Payé 🛑";
                      statusStyle = "bg-rose-105 text-rose-810 bg-rose-50 border-rose-300";
                    } else if (!isFullyPaid) {
                      statusLabelAr = "دفعة جزئية 🟡";
                      statusLabelFr = "Partiel 🟡";
                      statusStyle = "bg-amber-100 text-amber-800";
                    }

                    const progressPercentage = (scout.amountPaid / fee) * 100;

                    return (
                      <tr key={scout.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-950/40 transition">
                        
                        <td className="px-4 py-3 font-mono text-zinc-400 font-bold whitespace-nowrap">
                          {scout.regNo}
                        </td>

                        <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                          <div className="flex items-center justify-between gap-1.5">
                            <span>{scout.name}</span>
                            {(() => {
                              const scoutIncomes = incomes.filter(inc => inc.scoutId === scout.id);
                              if (scoutIncomes.length === 0) return null;
                              return (
                                <button
                                  onClick={() => onViewReceipt && onViewReceipt(scoutIncomes[0])}
                                  className="text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-850 px-1.5 py-0.5 rounded text-[10px] font-extrabold transition flex items-center gap-0.5 cursor-pointer shrink-0"
                                  title={locale === "ar" ? "طباعة الوصل المالي" : "Reçu"}
                                >
                                  <span>📄</span>
                                  <span>{locale === "ar" ? "الوصل" : "Reçu"}</span>
                                </button>
                              );
                            })()}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-zinc-500">
                          {formatDate(scout.dateAdded, locale)}
                        </td>

                        <td className="px-4 py-3">
                          <span className={`${statusStyle} text-3xs font-extrabold px-2 py-0.5 rounded-full border`}>
                            {locale === "ar" ? statusLabelAr : statusLabelFr}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-left">
                          <div className="space-y-1 block max-w-[120px] ml-auto">
                            <div className="flex justify-between font-bold">
                              <span>{scout.amountPaid}</span>
                              <span className="text-zinc-400">/ {fee}</span>
                            </div>
                            {/* Payment Progress bar */}
                            <div className="w-full bg-zinc-150 h-1 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded" style={{ width: `${progressPercentage}%` }} />
                            </div>
                          </div>
                        </td>

                        {isTreasurer && (
                          <td className="px-4 py-3 text-center">
                            {isFullyPaid ? (
                              <span className="text-emerald-600 font-extrabold text-2xs block">
                                <Check className="w-4 h-4 ml-1 inline text-emerald-650" />
                                {locale === "ar" ? "أتم الخلاص" : "Payé"}
                              </span>
                            ) : (
                              <button 
                                onClick={() => {
                                  setPaymentScoutId(scout.id);
                                  setPayAmount(fee - scout.amountPaid);
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-2 py-1 rounded text-3xs font-bold transition inline shadow-3xs"
                              >
                                {locale === "ar" ? "تسجيل دفعة" : "Régler d'acompte"}
                              </button>
                            )}
                          </td>
                        )}

                      </tr>
                    );
                  })}
                  {filteredScouts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-400">
                        {locale === "ar" ? "لا توجد أسماء كشافة مدونة كشجرة تكرار حالياً" : "Aucun scout inscrit dans cette liste."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

      {/* 🤝 Partial Payment Entry Dialog */}
      {paymentScoutId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 p-5 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-right">
              {locale === "ar" ? "تسجيل دفعة اشتراك كشفي جديدة" : "Enregistrer un versement"}
            </h3>
            
            <div className="space-y-3.5 text-xs text-right">
              <div>
                <label className="block text-2xs text-zinc-500 mb-1">{locale === "ar" ? "المبلغ المدفوع بالدينار" : "Montant versé (TND)"}</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 font-bold"
                  value={payAmount}
                  max={fee}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-2xs text-zinc-500 mb-1">{locale === "ar" ? "طريقة استلام الأموال" : "Mode de paiement"}</label>
                <select 
                  className="w-full px-3 py-2 border dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 font-bold"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                >
                  <option value="cash">{locale === "ar" ? "نقداً 💵" : "Espèces"}</option>
                  <option value="cheque">{locale === "ar" ? "شيك بنكي / بريدي 🧾" : "Chèque"}</option>
                  <option value="transfer">{locale === "ar" ? "تحويل كود / بريد 🏦" : "Virement"}</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs text-zinc-500 mb-1">{locale === "ar" ? "ملاحظة / رقم الإيداع" : "Notes complémentaires"}</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950"
                  placeholder=""
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={handleRecordPaymentSubmit}
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                {locale === "ar" ? "حفظ الدفعة بالصندوق" : "Valider"}
              </button>
              <button 
                onClick={() => setPaymentScoutId(null)}
                className="bg-zinc-200 text-zinc-700 hover:bg-zinc-300 font-bold text-xs px-3 py-2 rounded-lg transition"
              >
                {locale === "ar" ? "إلغاء" : "Quitter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📁 Excel Sheet CSV Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 border text-zinc-800 dark:text-zinc-150 p-6 rounded-2xl max-w-lg w-full space-y-4 text-right">
            <h3 className="font-extrabold text-sm flex items-center gap-1.5 justify-end">
              <Upload className="w-5 h-5 text-emerald-800" />
              <span>{locale === "ar" ? "معالج استيراد ملف الـ Excel" : "Module d'importation Excel / CSV"}</span>
            </h3>
            <p className="text-2xs text-zinc-500 leading-relaxed">
              {locale === "ar"
                ? "يمكنك لصق قائمة الأسماء مفصولة بفاصلة أو بنظام المسافات (Tab) لنقل الكشافة دفعة واحدة، أو النقر على الزر لتعبئة مثال جاهز كنموذج."
                : "Collez vos données de scouts (un par ligne au format : Nom, Matricule, MontantPayé) ou insérez nos données d'exemple."}
            </p>

            <textarea 
              className="w-full h-36 p-3 text-xs border dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 font-mono text-left"
              dir="ltr"
              placeholder="Example format:&#10;منير التونسي,K-111,60&#10;مريم المحجوب,K-112,30&#10;كمال اللواتي,K-113,0"
              value={inputBulkText}
              onChange={(e) => setInputBulkText(e.target.value)}
            />

            <div className="flex flex-wrap gap-2.5 justify-between pt-2">
              <button 
                onClick={fillExampleTemplate}
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 text-2xs font-extrabold px-3.5 py-2 rounded-lg transition"
              >
                {locale === "ar" ? "📋 إدراج مثال للتوضيح" : "Charger un exemple"}
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={handleBulkPasteImport}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white text-2xs font-bold px-4 py-2 rounded-lg transition"
                >
                  {locale === "ar" ? "قراءة واستبيان" : "Lancer l'analyse"}
                </button>
                <button 
                  onClick={() => setShowBulkModal(false)}
                  className="bg-zinc-200 text-zinc-700 text-2xs font-bold px-3 py-2 rounded-lg transition"
                >
                  {locale === "ar" ? "إغلاق" : "Fermer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
