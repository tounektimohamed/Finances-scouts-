import React, { useState, useRef } from "react";
import { CampSetup, User, ExpenseCategoryCode } from "../types";
import { DEMO_USERS, CATEGORIES_LIST } from "../initialData";
import { formatTND } from "../utils/helpers";
import { Settings, UserCheck, Shield, HelpCircle, Save } from "lucide-react";

interface CampSettingsProps {
  campSetup: CampSetup;
  currentUser: User;
  locale: "ar" | "fr";
  onUpdateSetup: (newSetup: CampSetup) => void;
  onSwitchUser: (userId: string) => void;
  onResetAllData: () => void;
  onLoadDemoData: () => void;
  categories: { code: string; labelAr: string; labelFr: string; emoji: string }[];
  onUpdateCategories: (newCats: any[]) => void;
  troopStamp: string | null;
  onUpdateStamp: (stamp: string | null) => void;
  troopSignature?: string | null;
  onUpdateSignature?: (signature: string | null) => void;
}

export default function CampSettings({
  campSetup,
  currentUser,
  locale,
  onUpdateSetup,
  onSwitchUser,
  onResetAllData,
  onLoadDemoData,
  categories,
  onUpdateCategories,
  troopStamp,
  onUpdateStamp,
  troopSignature = null,
  onUpdateSignature
}: CampSettingsProps) {
  
  // Local state for configuration form
  const [campName, setCampName] = useState(campSetup.campName);
  const [troopName, setTroopName] = useState(campSetup.troopName || "فوج الكشافة بقرطاج");
  const [startDate, setStartDate] = useState(campSetup.startDate);
  const [endDate, setEndDate] = useState(campSetup.endDate);
  const [scoutCount, setScoutCount] = useState(campSetup.scoutCount);
  const [leaderCount, setLeaderCount] = useState(campSetup.leaderCount);
  const [scoutFee, setScoutFee] = useState(campSetup.scoutFee);
  const [spendingLimit, setSpendingLimit] = useState(campSetup.spendingLimitWithoutApproval);
  
  // Categorized planned budget values
  const [plannedNode, setPlannedNode] = useState<Record<string, number>>({
    ...campSetup.plannedBudgets
  });

  const handleBudgetChange = (code: string, val: number) => {
    setPlannedNode(prev => ({
      ...prev,
      [code]: val
    }));
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support touches
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    
    // Standard mouse position (or unified)
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    const pos = getCoordinates(e);
    isDrawing.current = true;
    lastX.current = pos.x;
    lastY.current = pos.y;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    if (e.cancelable) e.preventDefault();
    const pos = getCoordinates(e);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1b3a4b"; // Beautiful midnight blue ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        ctx.beginPath();
        ctx.moveTo(lastX.current, lastY.current);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        
        lastX.current = pos.x;
        lastY.current = pos.y;
      }
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleAdoptSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if empty
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    const isBlank = !buffer.some(color => color !== 0);
    
    if (isBlank) {
      alert(locale === "ar" ? "الرجاء رسم توقيعك على المساحة المخصصة أولاً!" : "Veuillez dessiner votre signature avant de l'adopter.");
      return;
    }
    
    const dataUrl = canvas.toDataURL("image/png");
    if (onUpdateSignature) {
      onUpdateSignature(dataUrl);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSetup({
      campName,
      troopName,
      startDate,
      endDate,
      scoutCount,
      leaderCount,
      scoutFee,
      plannedBudgets: plannedNode,
      spendingLimitWithoutApproval: spendingLimit
    });
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Basic Info */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveConfig} className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-150 dark:border-zinc-855 shadow-3xs space-y-6">
            
            <div className="flex justify-between items-center border-b pb-3 dark:border-zinc-850">
              <h3 className="font-extrabold text-sm text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-emerald-800" />
                <span>{locale === "ar" ? "إعداد ميزانيات وبيانات المخيم" : "Configuration de l'Intendance du camp"}</span>
              </h3>
              <button 
                type="submit"
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs px-4 py-2 font-bold rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "حفظ التغييرات" : "Enregistrer"}</span>
              </button>
            </div>

            {/* Basic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "اسم الفوج الكشفي الضابط" : "Nom du groupe scout"}</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800 font-extrabold"
                  value={troopName}
                  onChange={(e) => setTroopName(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: فوج الكشافة بقرطاج" : "Ex: Groupe de Carthage"}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "اسم الفعالية / المخيّم الصيفي" : "Nom de l'activité / Camp"}</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "اشتراك معلوم مشاركة الكشاف (د.ت)" : "Frais de participation scout (TND)"}</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800 font-bold"
                  value={scoutFee}
                  onChange={(e) => setScoutFee(parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "تاريخ انطلاق التخييم" : "Date de début"}</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "تاريخ فك الخيام والعودة" : "Date de fin"}</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "عدد الكشافة المتوقعة بالمشاركة" : "Nombre de scouts"}</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800"
                  value={scoutCount}
                  onChange={(e) => setScoutCount(parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-3xs font-extrabold text-zinc-550 mb-1">{locale === "ar" ? "سقف الميزانية الفردية دون رخصة قائد النشاط" : "Limite dépenses sans approbation (TND)"}</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg focus:outline-emerald-800 font-bold text-amber-600"
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* طابع الفوج الكشفي / Stamp Upload */}
            <div className="p-4 bg-amber-50/40 dark:bg-zinc-900 rounded-xl border border-amber-100 dark:border-zinc-800 space-y-3">
              <h4 className="font-extrabold text-xs text-emerald-900 dark:text-emerald-400">
                {locale === "ar" ? "⚜️ طابع الفوج والختم الرقمي" : "⚜️ Cachet officiel du Groupe Scout"}
              </h4>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {troopStamp ? (
                  <div className="relative w-24 h-24 bg-white dark:bg-zinc-800 rounded-full border border-dashed border-emerald-600 flex items-center justify-center p-2 group shadow-inner">
                    <img src={troopStamp} alt="Troop Stamp" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    <button
                      type="button"
                      onClick={() => onUpdateStamp(null)}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-5 h-5 text-3xs font-black flex items-center justify-center cursor-pointer shadow hover:bg-rose-700"
                      title={locale === "ar" ? "حذف الطابع" : "Supprimer"}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650 bg-zinc-50 dark:bg-zinc-900 text-[10px] text-center font-bold p-1">
                    <span>{locale === "ar" ? "لا يوجد طابع" : "Aucun cachet"}</span>
                    <span className="text-[8px] font-normal text-zinc-400">{locale === "ar" ? "اضغط للتحميل" : "Cliquez ici"}</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="stamp-upload-settings-input"
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const base64Str = reader.result as string;
                          onUpdateStamp(base64Str);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById("stamp-upload-settings-input")?.click();
                    }}
                    className="bg-emerald-950 hover:bg-emerald-900 text-white font-extrabold text-[11px] px-3.5 py-2 rounded-lg transition shadow-3xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📷 {locale === "ar" ? "تحميل / تصوير الختم الكشفي للفوج" : "Charger le cachet"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* رسم واعتماد الإمضاء الكشفي الكروكي */}
            <div className="p-4 bg-emerald-50/25 dark:bg-zinc-900 rounded-xl border border-emerald-100/75 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs text-emerald-950 dark:text-emerald-400">
                  ✍️ {locale === "ar" ? "رسم وتثبيت إمضاء القائد / أمين المال" : "Dessiner & adopter la signature"}
                </span>
                {troopSignature && (
                  <button
                    type="button"
                    onClick={() => onUpdateSignature && onUpdateSignature(null)}
                    className="text-stone-400 hover:text-rose-650 font-extrabold text-[10px] underline cursor-pointer"
                  >
                    {locale === "ar" ? "إلغاء الإمضاء ✕" : "Réinitialiser ✕"}
                  </button>
                )}
              </div>

              {troopSignature ? (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] text-zinc-405 font-bold block">{locale === "ar" ? "الإمضاء الرقمي المعتمد حالياً:" : "Signature adoptée :"}</span>
                  <div className="bg-stone-50/60 dark:bg-zinc-900 p-2 border border-dashed border-emerald-300 w-full max-w-[280px] h-20 flex items-center justify-center rounded-lg">
                    <img src={troopSignature} alt="Adopted Signature" className="max-h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden relative">
                    <div className="absolute top-1.5 left-1.5 bg-zinc-105 dark:bg-zinc-900 rounded px-1.5 py-0.5 text-[8px] font-black text-zinc-400 pointer-events-none select-none uppercase">
                      {locale === "ar" ? "رسم حر بالإصبع أو الفأرة" : "Tablette de dessin"}
                    </div>
                    
                    <canvas
                      ref={canvasRef}
                      width={350}
                      height={120}
                      className="w-full h-[120px] bg-zinc-50/40 dark:bg-zinc-900/45 cursor-crosshair block touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  
                  <div className="flex gap-2 text-3xs font-black">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="flex-1 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-300 py-1.5 rounded-lg transition"
                    >
                      🧹 {locale === "ar" ? "مسح اللوحة" : "Effacer"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAdoptSignature}
                      className="flex-1 bg-emerald-900 hover:bg-emerald-950 text-white py-1.5 rounded-lg transition"
                    >
                      ✨ {locale === "ar" ? "اعتماد حفظ التوقيع" : "Adopter la signature"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Category planned budgets section */}
            <div className="space-y-4 pt-4 border-t dark:border-zinc-800">
              <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                {locale === "ar" ? "تعديل تقديرات ميزانية بنود الصرف كلياً" : "Budgets prévisionnels par poste de charge"}
              </h4>
              <p className="text-3xs text-zinc-400">
                {locale === "ar" 
                  ? "قم بضبط الحدود القصوى التقديرية لكل قسم لتفعيل نظام الإنذار المبكر ومقارنة الموازنة والانحراف المالي تلقائياً."
                  : "Fixez les limites prévues pour alerter l'intendant lors du dépassement de tranche."}
              </p>

              {/* Total Estimated Budget calculated from individual category estimations */}
              {(() => {
                const totalPlannedEst = categories.reduce((acc, cat) => acc + (plannedNode[cat.code] || 0), 0);
                return (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/40 flex justify-between items-center transition-all">
                    <div className="block text-right">
                      <span className="font-extrabold text-[11px] block">
                        {locale === "ar" ? "⚜️ إجمالي الميزانية التقديرية الكلية الصادرة من التقديرات:" : "⚜️ Budget global prévisionnel cumulé :"}
                      </span>
                      <span className="text-4xs text-zinc-450 dark:text-zinc-500 font-sans mt-0.5 block">
                        {locale === "ar" ? "(جمع تقديرات ميزانيات بنود التبويبات المحددة أدناه)" : "(Calculé automatiquement par somme des rubriques)"}
                      </span>
                    </div>
                    <span className="font-black text-sm text-emerald-950 dark:text-white bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg shadow-3xs">
                      {formatTND(totalPlannedEst, locale)}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                {categories.map((cat) => (
                  <div key={cat.code} className="flex items-center justify-between gap-3 bg-zinc-50/65 dark:bg-zinc-900/40 p-2.5 rounded-lg border dark:border-zinc-800">
                    <span className="font-bold text-3xs text-zinc-700 dark:text-zinc-300">
                      {cat.emoji || "📁"} {locale === "ar" ? cat.labelAr : cat.labelFr}
                    </span>
                    <input 
                      type="number"
                      className="w-24 px-2 py-1 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-850 dark:text-zinc-150 font-black text-left focus:outline-emerald-800"
                      value={plannedNode[cat.code] || 0}
                      onChange={(e) => handleBudgetChange(cat.code, parseInt(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* dynamic custom tab manager */}
            <div className="space-y-4 pt-6 border-t dark:border-zinc-800">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-emerald-800 dark:text-emerald-400">
                  {locale === "ar" ? "🛠️ إضافة وتخصيص تبويبات الدفتر الكشفي" : "🛠️ Gérer et Ajouter des Rubriques"}
                </h4>
              </div>
              <p className="text-3xs text-zinc-400 leading-relaxed">
                {locale === "ar" 
                  ? "يمكنك تعديل مسميات التبويبات المتوفرة أو إضافة بنود مخصصة صلب ميزانية المخيم (مثل التأمين، الهدايا، ورشات كشفية) فوراً، أو حذف التبويبات المضافة."
                  : "Personnalisez la nomenclature de vos charges : modifiez les rubriques existantes ou créez-en de nouvelles ou supprimez-les."}
              </p>

              {/* Editable items for Categories */}
              <div className="space-y-3">
                {categories.map((cat, idx) => {
                  return (
                    <div key={cat.code} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end bg-zinc-5 w-full p-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 p-3 rounded-xl text-right">
                      {/* Name Arabic */}
                      <div className="col-span-1">
                        <label className="text-[9px] text-zinc-400 block font-bold mb-0.5">{locale === "ar" ? "الاسم بالعربية" : "Nom (Ar)"}</label>
                        <input 
                          type="text"
                          className="w-full px-2 py-1 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 font-bold"
                          value={cat.labelAr}
                          onChange={(e) => {
                            const updated = [...categories];
                            updated[idx] = { ...updated[idx], labelAr: e.target.value };
                            onUpdateCategories(updated);
                          }}
                        />
                      </div>
                      
                      {/* Name French */}
                      <div className="col-span-1">
                        <label className="text-[9px] text-zinc-400 block font-bold mb-0.5">{locale === "ar" ? "الاسم بالفرنسية" : "Nom (Fr)"}</label>
                        <input 
                          type="text"
                          className="w-full px-2 py-1 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                          value={cat.labelFr}
                          onChange={(e) => {
                            const updated = [...categories];
                            updated[idx] = { ...updated[idx], labelFr: e.target.value };
                            onUpdateCategories(updated);
                          }}
                        />
                      </div>

                      {/* Emoji */}
                      <div className="col-span-1">
                        <label className="text-[9px] text-zinc-400 block font-bold mb-0.5">{locale === "ar" ? "أيقونة تعبيرية" : "Emoji"}</label>
                        <input 
                          type="text"
                          className="w-full px-2 py-1 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-center"
                          value={cat.emoji}
                          onChange={(e) => {
                            const updated = [...categories];
                            updated[idx] = { ...updated[idx], emoji: e.target.value };
                            onUpdateCategories(updated);
                          }}
                        />
                      </div>

                      {/* Action */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(locale === "ar" ? `هل ترغب في مسح التبويب الكشفي "${cat.labelAr}" نهائياً من القائمة؟` : `Supprimer la rubrique "${cat.labelFr}" ?`)) {
                              const updated = categories.filter(c => c.code !== cat.code);
                              onUpdateCategories(updated);
                            }
                          }}
                          className="w-full py-1.5 text-[10px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 rounded-lg font-black transition cursor-pointer text-center"
                        >
                          {locale === "ar" ? "حذف التبويب ❌" : "Supprimer"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Form to insert a brand new category */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <h5 className="font-extrabold text-[11px] text-emerald-900 dark:text-emerald-400">
                    {locale === "ar" ? "➕ إضافة تبويب كشفي جديد للميزانية" : "➕ Ajouter une nouvelle rubrique"}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input 
                        type="text"
                        placeholder={locale === "ar" ? "اسم البند بالعربية" : "Nom de la rubrique (Ar)"}
                        className="w-full px-2.5 py-1.5 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                        id="newCatAr"
                      />
                    </div>
                    <div>
                      <input 
                        type="text"
                        placeholder={locale === "ar" ? "الاسم بالفرنسية" : "Nom de la rubrique (Fr)"}
                        className="w-full px-2.5 py-1.5 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                        id="newCatFr"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder={locale === "ar" ? "أيقونة" : "Emoji"}
                        className="w-16 px-2.5 py-1.5 text-xs border dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-center"
                        maxLength={2}
                        id="newCatEmoji"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const arInput = document.getElementById("newCatAr") as HTMLInputElement;
                          const frInput = document.getElementById("newCatFr") as HTMLInputElement;
                          const emojiInput = document.getElementById("newCatEmoji") as HTMLInputElement;
                          
                          if (!arInput || !frInput || !emojiInput) return;
                          
                          const labelArVal = arInput.value.trim();
                          const labelFrVal = frInput.value.trim();
                          const emojiVal = emojiInput.value.trim() || "📦";

                          if (!labelArVal || !labelFrVal) {
                            alert(locale === "ar" ? "الرجاء كتابة الاسم بالعربية والفرنسية!" : "Veuillez fournir le nom des deux langues !");
                            return;
                          }

                          // Clean category code
                          const code = `custom_${Date.now()}`;
                          const newCat = {
                            code,
                            labelAr: `${labelArVal} ${emojiVal}`,
                            labelFr: `${labelFrVal} ${emojiVal}`,
                            emoji: emojiVal,
                            planned: 0
                          };

                          onUpdateCategories([...categories, newCat]);
                          
                          // Clear inputs
                          arInput.value = "";
                          frInput.value = "";
                          emojiInput.value = "🎁";
                        }}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-white font-black text-3xs py-1.5 rounded-lg transition text-center cursor-pointer"
                      >
                        {locale === "ar" ? "إضافة التبويب 🚀" : "Créer"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </form>
        </div>

        {/* Right column: Extra Admin Tools */}
        <div className="lg:col-span-1 space-y-4 text-right">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 p-5 rounded-2xl shadow-3xs space-y-4">
            <h4 className="font-extrabold text-xs text-rose-700 border-b pb-2 dark:border-zinc-800 text-rose-800 dark:text-rose-400">
              {locale === "ar" ? "إدارة وهيئة الدفتر كلياً" : "Administration du registre"}
            </h4>
            <p className="text-3xs text-zinc-400 leading-relaxed">
              {locale === "ar" 
                ? `يمكن لأمين المال تصفير مسودة الصندوق وإعادة الدفتر المالي لمخيم ${campSetup.campName || "فوج الكشافة"} إلى وضعه الأصلي الفارغ السليم لبدء مخيم جديد.`
                : "Gérez l'état du registre : réinitialisez-le à blanc (complètement vide) pour démarrer un nouveau camp."}
            </p>
            <div className="space-y-2.5">
              <button 
                onClick={() => {
                  if (window.confirm(locale === "ar" ? "هل أنت متأكد من مسح وإعادة تعيين كل الدفتر المالي الكشفي ليكون فضاءً فارغاً جديداً؟" : "Réinitialiser et vider complètement le registre ?")) {
                    onResetAllData();
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-3xs py-2 rounded-lg transition"
              >
                {locale === "ar" ? "⚠️ تصفير الدفتر كلياً (بدء استخدام فارغ)" : "Vider le registre (Nouveau Camp)"}
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
