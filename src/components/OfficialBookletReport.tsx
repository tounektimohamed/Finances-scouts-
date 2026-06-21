import React, { useState, useEffect } from "react";
import { Expense, Income, Scout, CampSetup } from "../types";
import { calculateCampDays } from "../utils/helpers";

interface OfficialBookletReportProps {
  expenses: Expense[];
  incomes: Income[];
  scouts: Scout[];
  campSetup: CampSetup;
  locale: "ar" | "fr";
  activeIncomes: Income[];
  activeApprovedExp: Expense[];
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  troopSignature?: string | null;
}

export default function OfficialBookletReport({
  scouts,
  campSetup,
  locale,
  activeIncomes,
  activeApprovedExp,
  totalIncome,
  totalExpense,
  currentBalance,
  troopSignature = null,
}: OfficialBookletReportProps) {
  // Only keep truly manual fields for signatures and counts - persisted in localStorage
  const [leaderName, setLeaderName] = useState<string>(() => localStorage.getItem("obook_leaderName") || "القائد طارق بن عمار");
  const [leaderTitle, setLeaderTitle] = useState<string>(() => localStorage.getItem("obook_leaderTitle") || "قائد النشاط");
  const [treasurerName, setTreasurerName] = useState<string>(() => localStorage.getItem("obook_treasurerName") || "القائد علي النفزي");
  const [treasurerTitle, setTreasurerTitle] = useState<string>(() => localStorage.getItem("obook_treasurerTitle") || "مقتصد النشاط");
  const [leaderCountNum, setLeaderCountNum] = useState<number>(() => {
    const saved = localStorage.getItem("obook_leaderCount");
    return saved ? parseInt(saved) : (campSetup.leaderCount || 0);
  });
  const [staffCount, setStaffCount] = useState<number>(() => {
    const saved = localStorage.getItem("obook_staffCount");
    return saved ? parseInt(saved) : (campSetup.externalGuidesCount || 0);
  });

  // Auto-persist to localStorage when values change
  useEffect(() => { localStorage.setItem("obook_leaderName", leaderName); }, [leaderName]);
  useEffect(() => { localStorage.setItem("obook_leaderTitle", leaderTitle); }, [leaderTitle]);
  useEffect(() => { localStorage.setItem("obook_treasurerName", treasurerName); }, [treasurerName]);
  useEffect(() => { localStorage.setItem("obook_treasurerTitle", treasurerTitle); }, [treasurerTitle]);
  useEffect(() => { localStorage.setItem("obook_leaderCount", String(leaderCountNum)); }, [leaderCountNum]);
  useEffect(() => { localStorage.setItem("obook_staffCount", String(staffCount)); }, [staffCount]);

  // All other fields are derived dynamically from the app data
  const campDays = calculateCampDays(campSetup.startDate, campSetup.endDate);
  const scoutCount = scouts.length > 0 ? scouts.length : campSetup.scoutCount;
  const totalPersons = scoutCount + leaderCountNum + staffCount;

  // Helper calculations for 9 official categories
  const getCategorySum = (code: string) => {
    return activeApprovedExp
      .filter((e) => e.category === code)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getWagesSum = () => {
    return activeApprovedExp
      .filter((e) => {
        const desc = (e.description || "").toLowerCase();
        const note = (e.note || "").toLowerCase();
        return (
          desc.includes("أجر") ||
          desc.includes("تعويض") ||
          desc.includes("أجرة") ||
          desc.includes("إكرامية") ||
          desc.includes("راتب") ||
          note.includes("أجر") ||
          note.includes("تعويض") ||
          note.includes("أجرة") ||
          note.includes("إكرامية") ||
          note.includes("راتب")
        );
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
  
  // Avoid double-counting wages if they exist under misc category
  const miscTotalRaw = getCategorySum("misc");
  const miscWages = activeApprovedExp
    .filter(
      (e) =>
        e.category === "misc" &&
        ((e.description || "").includes("أجر") ||
          (e.description || "").includes("تعويض") ||
          (e.description || "").includes("أجرة") ||
          (e.description || "").includes("إكرامية"))
    )
    .reduce((sum, e) => sum + e.amount, 0);
  const miscTotal = Math.max(0, miscTotalRaw - miscWages);

  return (
    <div className="space-y-12 text-zinc-800 dark:text-zinc-100" id="official-pages-container">
      
      {/* Dynamic Expose editable values trigger for parent sharing */}
      <span className="hidden" data-activity-type={campSetup.campName} data-structure-name={campSetup.troopName || "فوج الكشافة"} data-activity-target={campSetup.campName} data-session-name={`دورة ${new Date(campSetup.startDate).getFullYear()}`} data-city-name={(() => { try { const parts = campSetup.campName.split("-"); return parts.length > 1 ? parts[parts.length-1].trim() : campSetup.campName; } catch { return campSetup.campName; } })()} data-days-count={campDays} data-leader-count={campSetup.leaderCount} data-staff-count={0} data-leader-name={leaderName} data-leader-title={leaderTitle} data-treasurer-name={treasurerName} data-treasurer-title={treasurerTitle} id="official-meta-holder"></span>

      {/* Minimal edit panel for counts and signatures */}
      <div className="bg-amber-50/75 dark:bg-zinc-900/60 p-4 rounded-2xl border border-amber-200/50 dark:border-zinc-800 text-right space-y-3 no-print">
        <h4 className="font-extrabold text-xs text-amber-800 flex items-center justify-start gap-1">
          <span>⚙️ تعديل سريع للبيانات</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-2xs">
          <div>
            <label className="block text-zinc-500 mb-1 font-bold">{locale === "ar" ? "عدد القادة" : "Nombre de chefs"}</label>
            <input type="number" min="0" value={leaderCountNum} onChange={e => setLeaderCountNum(Math.max(0, Number(e.target.value)))} className="w-full bg-white dark:bg-zinc-950 border rounded-lg px-2 py-1 text-center font-bold" />
          </div>
          <div>
            <label className="block text-zinc-500 mb-1 font-bold">{locale === "ar" ? "الإطار المسير" : "Personnel encadrant"}</label>
            <input type="number" min="0" value={staffCount} onChange={e => setStaffCount(Math.max(0, Number(e.target.value)))} className="w-full bg-white dark:bg-zinc-950 border rounded-lg px-2 py-1 text-center font-bold" />
          </div>
          <div>
            <label className="block text-zinc-500 mb-1 font-bold">{locale === "ar" ? "المقتصد" : "Trésorier"}</label>
            <input type="text" value={treasurerName} onChange={e => setTreasurerName(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border rounded-lg px-2 py-1 text-center font-bold" />
          </div>
          <div>
            <label className="block text-zinc-500 mb-1 font-bold">{locale === "ar" ? "قائد النشاط" : "Chef d'activité"}</label>
            <input type="text" value={leaderName} onChange={e => setLeaderName(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border rounded-lg px-2 py-1 text-center font-bold" />
          </div>
        </div>
      </div>

      {/* PAGE 1: PAGE 23 OF THE HANDBOOK (INCOMES) */}
      <div className="bg-[#fbfbf8] dark:bg-zinc-950 border-4 border-double border-emerald-950 p-6 md:p-8 rounded-3xl relative mx-auto max-w-[800px] shadow-sm text-zinc-800">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[140px] md:text-[220px] text-emerald-900 opacity-[0.02] pointer-events-none select-none">
          ⚜️
        </div>
        
        {/* Double border header */}
        <div className="border-b-2 border-emerald-900/40 pb-4 flex justify-between items-start text-right">
          <div className="space-y-0.5">
            <span className="font-black text-xs text-emerald-900 block">منظمة الكشافة التونسية</span>
            <span className="text-4xs text-zinc-400 block font-mono">Tunisian Scouts Association</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold max-w-[240px] leading-tight text-left">
            نظير يرسل إلى القيادة العامة في ظرف شهر من نهاية النشاط
          </p>
        </div>

        <h2 className="text-base font-black text-center text-emerald-900 my-6 underline underline-offset-8">
          كشف مالي إجمالي للنشاط (المداخيل والمقبوضات)
        </h2>

        {/* Form Meta Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 text-xs font-bold my-4">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 shrink-0">نوع النشاط :</span>
            <span className="border-b border-dashed border-zinc-400 flex-1 px-1 text-zinc-900 text-center font-black">{campSetup.campName}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 shrink-0">الدورة :</span>
            <span className="border-b border-dashed border-zinc-400 flex-1 px-1 text-zinc-900 text-center font-black">دورة {new Date(campSetup.startDate).getFullYear()}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 shrink-0">الهيكل لـ :</span>
            <span className="border-b border-dashed border-zinc-400 flex-1 px-1 text-zinc-900 text-center font-black">{campSetup.troopName || "فوج الكشافة"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 shrink-0">المكان :</span>
            <span className="border-b border-dashed border-zinc-400 flex-1 px-1 text-zinc-900 text-center font-black">{(() => { try { const parts = campSetup.campName.split("-"); return parts.length > 1 ? parts[parts.length-1].trim() : campSetup.campName; } catch { return campSetup.campName; } })()}</span>
          </div>
          <div className="flex items-center gap-1 md:col-span-2">
            <span className="text-zinc-500 shrink-0">مخيم / ملتقى / دورة تكوينية لـ :</span>
            <span className="border-b border-dashed border-zinc-400 flex-1 px-2 text-zinc-900 font-black">{campSetup.campName}</span>
          </div>
          <div className="flex items-center gap-1 md:col-span-2 pb-2">
            <span className="text-zinc-500 shrink-0">التاريخ :</span>
            <span className="text-zinc-800">من :</span>
            <span className="border-b border-dashed border-zinc-400 px-2 text-zinc-950 font-black text-center min-w-[100px]">{campSetup.startDate}</span>
            <span className="text-zinc-800">إلى :</span>
            <span className="border-b border-dashed border-zinc-400 px-2 text-zinc-950 font-black text-center min-w-[100px]">{campSetup.endDate}</span>
          </div>
        </div>

        {/* Quantities boxes */}
        <div className="grid grid-cols-5 gap-2 text-center my-6">
          <div className="border border-emerald-900 rounded-lg p-2 bg-emerald-50/10">
            <p className="text-[9px] text-zinc-500 font-bold mb-1">عدد الأيام</p>
            <p className="font-black text-sm text-zinc-800">{campDays}</p>
          </div>
          <div className="border border-emerald-900 rounded-lg p-2 bg-emerald-50/10">
            <p className="text-[9px] text-zinc-500 font-bold mb-1">المشاركين</p>
            <p className="font-black text-sm text-zinc-800">{scouts.length > 0 ? scouts.length : campSetup.scoutCount}</p>
          </div>
          <div className="border border-emerald-900 rounded-lg p-2 bg-emerald-50/10">
            <p className="text-[9px] text-zinc-500 font-bold mb-1">عدد القادة</p>
            <p className="font-black text-sm text-zinc-800">{leaderCountNum}</p>
          </div>
          <div className="border border-emerald-900 rounded-lg p-2 bg-emerald-50/10">
            <p className="text-[9px] text-zinc-500 font-bold mb-1">الإطار المسير</p>
            <p className="font-black text-sm text-zinc-800">{staffCount}</p>
          </div>
          <div className="border-2 border-emerald-900 bg-emerald-900 text-white rounded-lg p-2 flex flex-col justify-center">
            <p className="text-[9px] text-emerald-100 font-bold mb-1">العدد الجملي</p>
            <p className="font-black text-sm">{totalPersons}</p>
          </div>
        </div>

        <h3 className="text-xs font-black text-emerald-950 border-r-4 border-emerald-900 pr-2 my-4 bg-emerald-50/20 py-1">الكشف المالي الدفيتري للمداخيل المقبوضة :</h3>

        <div className="space-y-4">
          {/* Section 1 */}
          <div className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/30">
            <h4 className="text-2xs font-extrabold text-zinc-700 mb-2">1- معلوم مشاركة المنتسبين (الكشافة) :</h4>
            <div className="flex flex-wrap items-center gap-2 justify-center text-xs font-bold">
              <span className="border border-zinc-200 bg-white px-2.5 py-1 rounded-md text-emerald-800">{campSetup.scoutFee.toFixed(3)} د.ت</span>
              <span className="text-zinc-500 text-3xs">معلوم فردي</span>
              <span className="text-zinc-550 font-black">×</span>
              <span className="border border-zinc-200 bg-white px-2.5 py-1 rounded-md text-zinc-800">{(scouts.length > 0 ? scouts.length : campSetup.scoutCount)} مشارك</span>
              <span className="text-zinc-550 font-black">=</span>
              <span className="border-2 border-emerald-950 bg-emerald-50/40 px-3 py-1 rounded-md text-emerald-950 font-sans font-black">
                {(campSetup.scoutFee * (scouts.length > 0 ? scouts.length : campSetup.scoutCount)).toFixed(3)} د.ت
              </span>
            </div>
          </div>

          {/* Section 2 */}
          <div className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/30 text-2xs">
            <h4 className="text-2xs font-extrabold text-zinc-700 mb-2">2- المنح والتمويلات الاستثنائية :</h4>
            <div className="space-y-2">
              {(() => {
                const grants = activeIncomes.filter(i => i.type === "grant");
                const list = [];
                for (let i = 0; i < 3; i++) {
                  const g = grants[i];
                  list.push(
                    <div key={`grant-${i}`} className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-zinc-400 shrink-0">• منحة:</span>
                        <span className="font-bold text-zinc-800 flex-1 border-b border-dotted border-zinc-300 pb-0.5 max-w-full truncate">
                          {g ? g.payerName : "..........................................................................."}
                        </span>
                      </div>
                      <div className="font-black font-sans border bg-white px-1.5 py-0.5 rounded w-24 text-left text-emerald-700">
                        {g ? g.amount.toFixed(3) : "0.000"} د.ت
                      </div>
                    </div>
                  );
                }
                return list;
              })()}
            </div>
          </div>

          {/* Section 3 */}
          <div className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/30 text-2xs">
            <h4 className="text-2xs font-extrabold text-zinc-700 mb-2">3- التبرعات والدعم والاحتياط والأنشطة :</h4>
            <div className="space-y-2">
              {(() => {
                const supports = activeIncomes.filter(i => i.type !== "grant" && i.type !== "participation");
                const list = [];
                for (let i = 0; i < 2; i++) {
                  const s = supports[i];
                  list.push(
                    <div key={`support-${i}`} className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-zinc-400 shrink-0">• دعم/تبرّعات:</span>
                        <span className="font-bold text-zinc-800 flex-1 border-b border-dotted border-zinc-300 pb-0.5 max-w-full truncate">
                          {s ? s.payerName : "..........................................................................."}
                        </span>
                      </div>
                      <div className="font-black font-sans border bg-white px-1.5 py-0.5 rounded w-24 text-left text-emerald-700">
                        {s ? s.amount.toFixed(3) : "0.000"} د.ت
                      </div>
                    </div>
                  );
                }
                return list;
              })()}
            </div>
          </div>
        </div>

        {/* Grand Total banner */}
        <div className="mt-8 border-2 border-emerald-950 bg-emerald-900 text-white rounded-xl p-3.5 flex justify-between items-center shadow-xs">
          <span className="font-black text-[11px]">المخطط الإجمالي العام للمداخيل المقبوضة :</span>
          <span className="font-sans font-black text-sm">{totalIncome.toFixed(3)} د.ت</span>
        </div>

        {/* Footer info booklet */}
        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 mt-6 pt-4 border-t border-zinc-200/50">
          <span>الكشافة التونسية © كراس العهد المالية</span>
          <span className="text-2xs font-black bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">صفحة 23</span>
        </div>
      </div>

      {/* PAGE 2: PAGE 24 OF THE HANDBOOK (EXPENSES) */}
      <div className="bg-[#fbfbf8] dark:bg-zinc-950 border-4 border-double border-emerald-950 p-6 md:p-8 rounded-3xl relative mx-auto max-w-[800px] shadow-sm text-zinc-800">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[140px] md:text-[220px] text-emerald-900 opacity-[0.02] pointer-events-none select-none">
          ⚜️
        </div>
        
        {/* Double border header */}
        <div className="border-b-2 border-emerald-900/40 pb-4 flex justify-between items-start text-right">
          <div className="space-y-0.5">
            <span className="font-black text-xs text-emerald-900 block font-mono">الكشافة التونسية</span>
            <span className="text-4xs text-zinc-400 block font-mono">Tunisian Scouts Association</span>
          </div>
          <span className="text-[10px] text-zinc-650 font-black">المخصص / مصاريف والفوائض المتبقية</span>
        </div>

        <h2 className="text-base font-black text-center text-rose-800 my-6 underline underline-offset-8">
          كشف مالي إجمالي للنشاط (المصروفات والموازنة الختامية)
        </h2>

        <h3 className="text-xs font-black text-emerald-950 border-r-4 border-rose-800 pr-2 my-4 bg-rose-50/20 py-1">تفصيل المخصصات والتبويب الفعلي للمصاريف :</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-2xs font-bold leading-relaxed">
          {/* Column A */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">1- الأنشطة التربوية والورشات</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {activitiesTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">2- التأمين والعلاج الطبي</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {healthTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">3- النشر والإعلام والاتصال</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {mediaTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">4- الأجور والتعويضات المهنية</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {wagesTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">5- مصاريف مختلفة وطارئة</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {miscTotal.toFixed(3)} د.ت
              </div>
            </div>
          </div>

          {/* Column B */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">6- التغذية والإعاشة اليومية</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {nutritionTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">7- التنقل والمحروقات كراء الحافلة</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {transportTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">8- التجهيز والملبوسات والطباعة</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {printingTotal.toFixed(3)} د.ت
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-650">9- الإقامة وحجز مراكز التخييم</span>
              <div className="flex-1 border-b border-dotted border-zinc-350 mx-2"></div>
              <div className="font-black font-sans border bg-white px-2 py-0.5 rounded w-28 text-left text-rose-700">
                {lodgingTotal.toFixed(3)} د.ت
              </div>
            </div>
          </div>
        </div>

        {/* Grand Total Expenses banner */}
        <div className="mt-6 border-2 border-rose-800 bg-rose-50 text-rose-900 rounded-xl p-3 flex justify-between items-center text-xs font-black">
          <span>المجموع العام النهائي للمصاريف الفعلية للدورة :</span>
          <span className="font-sans font-black text-sm">{totalExpense.toFixed(3)} د.ت</span>
        </div>

        {/* Final Comparison Table */}
        <div className="mt-6 p-4 border border-zinc-250 rounded-xl bg-zinc-50/60 text-2xs font-extrabold">
          <h4 className="text-[10px] font-black text-center mb-3 text-zinc-800">الحصيلة المالية الختامية للدورة الكشفية :</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-bold">
            <div className="border border-zinc-200 bg-white p-2 rounded-lg">
              <p className="text-zinc-400 mb-1 text-[9px]">جملة المداخيل 🏦</p>
              <p className="font-sans font-black text-emerald-800 text-[11px]">{totalIncome.toFixed(3)} د.ت</p>
            </div>
            <div className="border border-zinc-200 bg-white p-2 rounded-lg">
              <p className="text-zinc-400 mb-1 text-[9px]">جملة المصاريف 💸</p>
              <p className="font-sans font-black text-rose-700 text-[11px]">{totalExpense.toFixed(3)} د.ت</p>
            </div>
            <div className={`border p-2 rounded-lg ${currentBalance >= 0 ? "bg-emerald-50 border-emerald-300" : "bg-white border-zinc-200"}`}>
              <p className="text-zinc-400 mb-1 text-[9px]">الفائض المتبقي 📈</p>
              <p className="font-sans font-black text-emerald-700 text-[11px]">
                {currentBalance >= 0 ? currentBalance.toFixed(3) : "0.000"} د.ت
              </p>
            </div>
            <div className={`border p-2 rounded-lg ${currentBalance < 0 ? "bg-rose-50 border-rose-300" : "bg-white border-zinc-200"}`}>
              <p className="text-zinc-400 mb-1 text-[9px]">العجز المالي 📉</p>
              <p className="font-sans font-black text-rose-600 text-[11px]">
                {currentBalance < 0 ? Math.abs(currentBalance).toFixed(3) : "0.000"} د.ت
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Inputs for Signatures directly within the visual page block */}
        <div className="mt-8 grid grid-cols-2 gap-6 text-center border-t border-dashed border-emerald-900 pt-5 text-2xs font-bold leading-normal">
          {/* Steward Signature Block */}
          <div className="space-y-1">
            <input type="text" value={treasurerTitle} onChange={e => setTreasurerTitle(e.target.value)} className="text-center font-black uppercase text-emerald-950 border-none bg-transparent focus:outline-none w-full" />
            <div className="flex flex-col items-center justify-center p-1 border border-zinc-200 border-dashed rounded-lg bg-white/40 h-20 relative overflow-hidden">
              {troopSignature ? (
                <img src={troopSignature} alt="Signature" className="max-h-[48px] object-contain mix-blend-multiply select-none" />
              ) : (
                <span className="text-[8px] text-zinc-400 italic font-medium">مربع إمضاء وتأشيرة أمانة المال</span>
              )}
              <span className="font-black text-[10px] text-zinc-800 mt-1">{treasurerName}</span>
            </div>
            <div className="flex items-center gap-1 justify-center text-[9px] text-zinc-500">
              <span>الاسم واللقب:</span>
              <input type="text" value={treasurerName} onChange={e => setTreasurerName(e.target.value)} className="border-b border-dashed border-zinc-300 bg-transparent text-center focus:outline-none focus:border-emerald-800 w-24" />
            </div>
          </div>

          {/* Activity Leader Signature Block */}
          <div className="space-y-1">
            <input type="text" value={leaderTitle} onChange={e => setLeaderTitle(e.target.value)} className="text-center font-black uppercase text-emerald-950 border-none bg-transparent focus:outline-none w-full" />
            <div className="flex flex-col items-center justify-center p-1 border border-zinc-200 border-dashed rounded-lg bg-white/40 h-20 relative overflow-hidden">
              {troopSignature ? (
                <img src={troopSignature} alt="Signature" className="max-h-[48px] object-contain mix-blend-multiply select-none" />
              ) : (
                <span className="text-[8px] text-zinc-400 italic font-medium">مربع إمضاء وتأشيرة قيادة النشاط</span>
              )}
              <span className="font-black text-[10px] text-zinc-800 mt-1">{leaderName}</span>
            </div>
            <div className="flex items-center gap-1 justify-center text-[9px] text-zinc-500">
              <span>الاسم واللقب:</span>
              <input type="text" value={leaderName} onChange={e => setLeaderName(e.target.value)} className="border-b border-dashed border-zinc-300 bg-transparent text-center focus:outline-none focus:border-emerald-800 w-24" />
            </div>
          </div>
        </div>

        <p className="text-emerald-950 font-black text-[9px] text-center border-t border-emerald-900/10 pt-4 mt-6">
          ملاحظة هامّة: يجب إحترام الميزانية الموضوعة للنشاط والابتعاد عن العجز لتأمين النجاح المالي والتربوي للفوج. ⚜️
        </p>

        {/* Footer info booklet */}
        <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 mt-4 pt-3">
          <span>الكشافة التونسية © كراس العهد المالية</span>
          <span className="text-2xs font-black bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">صفحة 24</span>
        </div>
      </div>

    </div>
  );
}
