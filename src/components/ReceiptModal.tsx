import React, { useRef } from "react";
import { Income } from "../types";
import { formatDate, formatTND } from "../utils/helpers";
import { X, Printer, Share2, PhoneCall, Check, Image as ImageIcon } from "lucide-react";

interface ReceiptModalProps {
  income: Income | null;
  onClose: () => void;
  locale: "ar" | "fr";
  troopStamp: string | null;
  onUploadStamp?: (stamp: string) => void;
}

export default function ReceiptModal({
  income,
  onClose,
  locale,
  troopStamp,
  onUploadStamp
}: ReceiptModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!income) return null;

  // Function to convert amount in figures to words (simplified Arabic scout style)
  const getAmountInWordsAr = (amount: number) => {
    const integerPart = Math.floor(amount);
    const wordsMap: Record<number, string> = {
      10: "عشرة دنانير",
      20: "عشرون ديناراً تونسياً",
      30: "ثلاثون ديناراً تونسياً",
      40: "أربعون ديناراً تونسياً",
      50: "خمسون ديناراً تونسياً",
      60: "ستون ديناراً تونسياً",
      70: "سبعون ديناراً تونسياً",
      80: "ثمانون ديناراً تونسياً",
      90: "تسعون ديناراً تونسياً",
      100: "مائة دينار تونسي",
      120: "مائة وعشرون ديناراً تونسياً",
      150: "مائة وخمسون ديناراً تونسياً",
      200: "مائتان دينار تونسي",
      250: "مائتان وخمسون ديناراً تونسياً",
      300: "ثلاثمائة دينار تونسي",
      500: "خمسمائة دينار تونسي",
    };

    if (wordsMap[integerPart]) return wordsMap[integerPart] + " لا غير";
    
    // Fallback simple verbalizer
    return `${integerPart} ديناراً تونسياً لا غير`;
  };

  const amountInWords = locale === "ar" 
    ? getAmountInWordsAr(income.amount) 
    : `${income.amount} Dinars Tunisiens`;

  const handlePrint = () => {
    const printArea = printAreaRef.current;
    if (!printArea) return;

    // 1. Create temporary print container directly on document.body for iframe sandbox compatibility
    const tempDiv = document.createElement('div');
    tempDiv.className = 'temp-print-container';
    tempDiv.dir = locale === "ar" ? "rtl" : "ltr";
    tempDiv.innerHTML = printArea.outerHTML;
    document.body.appendChild(tempDiv);

    // 2. Inject print simulation styles that hide root and display only the receipt
    const styleEl = document.createElement('style');
    styleEl.id = 'receipt-print-style-in-place';
    styleEl.innerHTML = `
      @media print {
        #root {
          display: none !important;
        }
        .temp-print-container {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 10px !important;
        }
        .temp-print-container > div {
          margin: 0 auto !important;
          box-shadow: none !important;
          border-color: #065f46 !important;
          max-width: 530px !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      @media screen {
        .temp-print-container {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    // 3. Trigger printing on the main window directly (iframe-safe)
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

  const handleShareWhatsApp = () => {
    // Build direct WhatsApp API messaging URL
    const phoneNum = income.payerPhone ? income.payerPhone.replace(/\s+/g, "") : "";
    const cleanPhone = phoneNum.startsWith("+") ? phoneNum.substring(1) : phoneNum;

    const messageText = `⚜️ *وصل استلام مالي كشفي رسمي* ⚜️
----------------------------------------
*رقم الوصل:* ${income.receiptNo}
*التاريخ:* ${formatDate(income.date, "ar")}
*المبلغ المستلم:* ${formatTND(income.amount, "ar")} (${amountInWords})
*من الفاضل(ة) / الولي:* ${income.payerName}
*السبب / الغرض:* ${income.incomeReason || income.note || "مساهمة كشفية"}
*القائد المستلم:* ${income.receivedByLeader || "أمين صندوق الفوج"}
----------------------------------------
نشكركم على مساهمتكم الكريمة ودعمكم المتواصل لفوجنا الكشفي المعطاء! 🏕️⚜️`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
    
    window.open(whatsappUrl, "_blank", "referrer");
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadStamp) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUploadStamp(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-xl shadow-2xl border border-zinc-100 dark:border-zinc-850 flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-950 text-white p-5 flex justify-between items-center relative">
          <div>
            <span className="bg-emerald-800 text-amber-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">
              {locale === "ar" ? "تفاصيل المقبوضات والوصل" : "Détails du Reçu"}
            </span>
            <h3 className="font-extrabold text-sm flex items-center gap-1.5">
              <span>⚜️</span>
              <span>{locale === "ar" ? "معاينة الوصل الكشفي" : "Aperçu du Reçu Scout"}</span>
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-emerald-900/60 hover:bg-emerald-900 rounded-full text-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar Above Draft */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 border-b dark:border-zinc-850 flex flex-wrap gap-2.5 items-center justify-between text-2xs font-extrabold">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "طباعة وحفظ كـ PDF" : "Imprimer / PDF"}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "مشاركة عبر واتساب" : "WhatsApp"}</span>
            </button>
          </div>

          {!troopStamp && onUploadStamp && (
            <div className="flex items-center gap-1">
              <input
                type="file"
                accept="image/*"
                id="stamp-fast-modal-upload"
                className="hidden"
                onChange={handleLocalFileChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById("stamp-fast-modal-upload")?.click()}
                className="text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-zinc-800 dark:text-amber-400 border border-amber-200 dark:border-zinc-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>{locale === "ar" ? "تحميل طابع كشفي سريع 🏷️" : "Ajouter Tampon"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Paper Container Preview (Perfect Authentic Styling) */}
        <div className="p-6 bg-zinc-100 dark:bg-zinc-900 overflow-y-auto flex-1 font-sans">
          
          <div 
            ref={printAreaRef}
            className="bg-[#fdfdfa] text-zinc-900 border border-amber-100 rounded-2xl shadow-md p-6 max-w-lg mx-auto relative overflow-hidden ring-1 ring-black/5"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            {/* Double Scout Border */}
            <div className="border-[4px] border-double border-emerald-950 p-5 rounded-xl bg-[#fefefe]/80 h-full relative">
              
              {/* Scout Flag Fleur de Lis overlay background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                <span className="text-[180px]">⚜️</span>
              </div>

              {/* Receipt Header */}
              <div className="text-center relative pb-3 border-b border-dashed border-emerald-900/40">
                <div className="text-xl text-emerald-950 font-black mb-1">⚜️</div>
                <h4 className="text-xs font-black tracking-tight text-emerald-900 uppercase">
                  {locale === "ar" ? "منظمة الكشافة التونسية" : "Scouts Tunisiens"}
                </h4>
                <p className="text-[10px] text-zinc-550 font-bold">
                  {locale === "ar" ? "الفوج الكشفي المحلي / أمانة المال والعهد" : "Groupe Scout - Intendance Générale"}
                </p>
                <span className="absolute top-0 right-0 text-[9px] text-rose-700 font-black border border-rose-200 px-1 py-0.2 rounded font-mono">
                  {income.receiptNo}
                </span>
                <span className="absolute top-0 left-0 text-[8px] text-zinc-400 font-mono">
                  {formatDate(income.date, locale)}
                </span>
              </div>

              {/* Inner Title */}
              <h5 className="text-center text-[13px] font-black underline decoration-emerald-800 underline-offset-4 text-emerald-950 my-4 uppercase">
                {locale === "ar" ? "وصل استلام واستلام أموال كشفي" : "REÇU DE RECOUVREMENT FINANCIER"}
              </h5>

              {/* Data Rows */}
              <table className="w-full text-2xs md:text-xs">
                <tbody>
                  <tr className="border-b border-zinc-100">
                    <td className="py-2.5 font-black text-zinc-550 w-[30%]">
                      {locale === "ar" ? "الجهة الدافعة / الاسم:" : "Payer Name:"}
                    </td>
                    <td className="py-2.5 font-extrabold text-zinc-900">
                      {income.payerName}
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-100">
                    <td className="py-2.5 font-black text-zinc-550">
                      {locale === "ar" ? "السبب والغرض الكشفي:" : "Motif de paiement:"}
                    </td>
                    <td className="py-2.5 font-bold text-zinc-800">
                      {income.incomeReason || income.note || (locale === "ar" ? "اشتراكات كشفية ومساهمات النشاط" : "Adhésions scoutes")}
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-100">
                    <td className="py-2.5 font-black text-zinc-550">
                      {locale === "ar" ? "المبلغ المتسلم رقمياً:" : "Montant en Chiffres:"}
                    </td>
                    <td className="py-2.5 font-black text-emerald-800 font-mono text-[13px]">
                      {formatTND(income.amount, locale)}
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-100">
                    <td className="py-2.5 font-black text-zinc-550">
                      {locale === "ar" ? "حروفاً وكتابة فقط لا غير:" : "Montant en Lettres:"}
                    </td>
                    <td className="py-2.5 font-bold text-zinc-700 italic">
                      {amountInWords}
                    </td>
                  </tr>

                  <tr className="border-b border-zinc-100">
                    <td className="py-2.5 font-black text-zinc-550">
                      {locale === "ar" ? "طريقة الدفع:" : "Mode de règlement:"}
                    </td>
                    <td className="py-2.5 font-bold text-zinc-650">
                      {income.method === "cash" 
                        ? (locale === "ar" ? "نقداً 💵" : "Espèces") 
                        : income.method === "cheque" 
                          ? (locale === "ar" ? "شيك بنكي / بريدي 🧾" : "Chèque") 
                          : (locale === "ar" ? "تحويل بنكي / بريدي مباشر 🏦" : "Virement")}
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-black text-zinc-550">
                      {locale === "ar" ? "القائد المستلم للمبلغ:" : "Responsable récepteur:"}
                    </td>
                    <td className="py-2.5 font-extrabold text-emerald-950 font-sans">
                      {income.receivedByLeader || "أمين صندوق الفوج الكشفي"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total Box */}
              <div className="mt-5 p-3.5 bg-emerald-50/50 border-2 border-dashed border-emerald-900 rounded-lg text-center font-black text-emerald-850 text-sm">
                {locale === "ar" ? "المبلغ المقبوض" : "MONTANT PERÇU"} : {formatTND(income.amount, locale)}
              </div>

              {/* signatures and STAMP */}
              <div className="mt-8 flex justify-between items-start text-3xs font-black relative min-h-[110px]">
                <div className="text-center w-[45%]">
                  <p className="underline decoration-1 mb-10 text-zinc-500">
                    {locale === "ar" ? "إمضاء المستلم" : "Signature du récepteur"}
                  </p>
                  <p className="font-extrabold text-zinc-700 text-[10px]">
                    {income.receivedByLeader || "أمين صندوق الفوج"}
                  </p>
                </div>

                <div className="text-center w-[45%] relative flex flex-col items-center">
                  <p className="underline decoration-1 mb-10 text-zinc-500">
                    {locale === "ar" ? "طابع الفوج الرسمي" : "Timbre du Groupe"}
                  </p>
                  
                  {troopStamp ? (
                    <img 
                      src={troopStamp} 
                      alt="Stamp Seal"
                      className="absolute -bottom-4 right-2 w-[100px] h-[100px] object-contain rotate-[-12deg] opacity-[0.88] mix-blend-multiply select-none" 
                    />
                  ) : (
                    <div className="absolute -bottom-2 right-4 border-2 border-dashed border-rose-400 rounded-full w-14 h-14 p-1 flex items-center justify-center text-center text-[7px] text-rose-500 font-bold rotate-6 select-none opacity-80">
                      {locale === "ar" ? "بانتظار الطابع الكشفي ⚜️" : "Pas de Tampon"}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* WhatsApp explicit target indicator */}
        {income.payerPhone && (
          <div className="bg-emerald-50 dark:bg-emerald-955/20 px-5 py-3.5 border-t dark:border-zinc-850 flex items-center gap-2">
            <div className="p-1.5 bg-[#25D366]/20 rounded-full text-[#25D366]">
              <PhoneCall className="w-4 h-4 animate-bounce" />
            </div>
            <p className="text-[11px] text-emerald-950 dark:text-emerald-300 font-extrabold leading-relaxed">
              {locale === "ar" 
                ? `سيتم توجيه الإشعار للولي على الرقم المضاف: ${income.payerPhone}` 
                : `L'envoi WhatsApp ciblera le téléphone : ${income.payerPhone}`}
            </p>
          </div>
        )}

        {/* Footer info lock */}
        <div className="bg-zinc-100 dark:bg-zinc-900 px-5 py-3.5 flex justify-end gap-2 text-2xs font-bold border-t dark:border-zinc-850">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg cursor-pointer transition"
          >
            {locale === "ar" ? "إغلاق المعاينة" : "Fermer"}
          </button>
        </div>

      </div>
    </div>
  );
}
