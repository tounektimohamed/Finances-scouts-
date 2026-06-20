import React, { useRef, useState } from "react";
import { Income } from "../types";
import { formatDate, formatTND } from "../utils/helpers";
import { X, Printer, Share2, PhoneCall, Check, Image as ImageIcon, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReceiptModalProps {
  income: Income | null;
  onClose: () => void;
  locale: "ar" | "fr";
  troopStamp: string | null;
  onUploadStamp?: (stamp: string) => void;
  troopSignature?: string | null;
  troopName?: string | null;
}

export default function ReceiptModal({
  income,
  onClose,
  locale,
  troopStamp,
  onUploadStamp,
  troopSignature = null,
  troopName = null
}: ReceiptModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPDFInstruction, setShowPDFInstruction] = useState(false);

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

  const handleDownloadHTML = () => {
    const methodLabel = income.method === "cash" 
      ? (locale === "ar" ? "نقداً 💵" : "Espèces") 
      : income.method === "cheque" 
        ? (locale === "ar" ? "شيك بنكي / بريدي 🧾" : "Chèque") 
        : (locale === "ar" ? "تحويل بنكي / بريدي مباشر 🏦" : "Virement");

    const stampContent = troopStamp 
      ? `<img src="${troopStamp}" style="max-height: 90px; max-width: 90px; object-fit: contain; transform: rotate(-10deg); opacity: 0.95; filter: multiply;" alt="Stamp" />`
      : `<div style="border: 2px dashed #f87171; color: #ef4444; border-radius: 50%; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 7.5px; font-weight: bold; transform: rotate(6deg);">${locale === "ar" ? "بانتظار الطابع الكشفي ⚜️" : "Pas de Tampon"}</div>`;

    const signatureContent = troopSignature
      ? `<img src="${troopSignature}" style="max-height: 52px; max-width: 140px; object-fit: contain; mix-blend-multiply; display: block; margin: 4px auto 0;" alt="Signature" />`
      : `<div style="border: 1px dashed #d1d5db; border-radius: 4px; padding: 4px; font-size: 8px; color: #9ca3af; margin-top: 5px;">${locale === "ar" ? "قلم حر رقمي غير موقع بعد" : "Non signée"}</div>`;

    const docTitle = locale === "ar" ? `وصل_استلام_${income.receiptNo}` : `Recu_Scout_${income.receiptNo}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>${locale === "ar" ? "وصل استلام كشفي رقم " : "Reçu Scout N°"}${income.receiptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #f4f4f5;
      margin: 0;
      padding: 30px 15px;
      direction: ${locale === "ar" ? "rtl" : "ltr"};
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .action-bar {
      margin-bottom: 25px;
      width: 100%;
      max-width: 530px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .btn {
      padding: 11px 20px;
      font-size: 13px;
      font-weight: 800;
      border: none;
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
    }
    .btn-secondary {
      background-color: #e4e4e7;
      color: #27272a;
    }
    .receipt-box {
      background-color: #fdfdfa;
      border: 1px solid #fcd34d;
      border-radius: 20px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      padding: 24px;
      max-width: 530px;
      width: 100%;
      position: relative;
      box-sizing: border-box;
      background-image: radial-gradient(circle, #fbfbf6 0%, #fdfdf9 100%);
    }
    .scout-border {
      border: 4px double #064e3b;
      padding: 24px;
      border-radius: 14px;
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 200px;
      opacity: 0.035;
      pointer-events: none;
      user-select: none;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed rgba(6, 78, 59, 0.25);
      padding-bottom: 14px;
      margin-bottom: 20px;
      position: relative;
    }
    .meta-no {
      position: absolute;
      top: 0;
      right: 0;
      border: 1.5px solid #fecaca;
      color: #dc2626;
      background-color: #fef2f2;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 900;
      border-radius: 6px;
    }
    .meta-date {
      position: absolute;
      top: 0;
      left: 0;
      font-size: 9.5px;
      font-weight: bold;
      color: #4b5563;
    }
    .scout-symbol {
      font-size: 32px;
      color: #064e3b;
      margin-bottom: 4px;
    }
    .title-org {
      font-size: 15px;
      font-weight: 900;
      color: #064e3b;
      margin: 0;
    }
    .sub-org {
      font-size: 10px;
      font-weight: bold;
      color: #4b5563;
      margin: 4px 0 0 0;
    }
    .receipt-title {
      font-size: 14px;
      font-weight: 900;
      text-align: center;
      text-decoration: underline;
      text-decoration-color: #064e3b;
      text-underline-offset: 4px;
      color: #064e3b;
      margin: 20px 0;
    }
    .table-info {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .table-info td {
      padding: 11px 6px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12px;
      vertical-align: top;
    }
    .table-info td.label {
      font-weight: 900;
      color: #4b5563;
      width: 35%;
    }
    .table-info td.value {
      font-weight: 800;
      color: #111827;
    }
    .total-box {
      background-color: rgba(6, 95, 70, 0.05);
      border: 2px dashed #064e3b;
      color: #064e3b;
      padding: 14px;
      border-radius: 10px;
      text-align: center;
      font-size: 15px;
      font-weight: 900;
      margin: 20px 0;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      min-height: 120px;
    }
    .signature-col {
      width: 45%;
      text-align: center;
    }
    .sig-title {
      font-size: 10.5px;
      font-weight: bold;
      color: #6b7280;
      text-decoration: underline;
      margin-bottom: 50px;
    }
    .sig-name {
      font-size: 11px;
      font-weight: 900;
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
      .receipt-box {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
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
      <span>✕ ${locale === "ar" ? "إغلاق نافذة المعاينة" : "Fermer"}</span>
    </button>
  </div>

  <div class="receipt-box">
    <div class="scout-border">
      <div class="watermark">⚜️</div>

      <div class="header">
        <div class="scout-symbol">⚜️</div>
        <h4 class="title-org">${locale === "ar" ? "الكشافة التونسية" : "Scouts Tunisiens"}</h4>
        <p class="sub-org">${locale === "ar" ? (troopName ? `${troopName} / أمانة المال والعهد` : "فوج الكشافة / أمانة المال والعهد") : "Groupe Scout - Intendance Générale"}</p>
        <span class="meta-no">${income.receiptNo}</span>
        <span class="meta-date">${formatDate(income.date, locale)}</span>
      </div>

      <h5 class="receipt-title">${locale === "ar" ? "وصل استلام واستلام أموال كشفي" : "REÇU DE CAISSE SCOUT"}</h5>

      <table class="table-info">
        <tr>
          <td class="label">${locale === "ar" ? "الجهة الدافعة / الاسم الاسم:" : "Payer Name:"}</td>
          <td class="value">${income.payerName}</td>
        </tr>
        <tr>
          <td class="label">${locale === "ar" ? "السبب والغرض الكشفي:" : "Motif de paiement:"}</td>
          <td class="value">${income.incomeReason || income.note || (locale === "ar" ? "اشتراكات كشفية ومساهمات النشاط" : "Adhésions scoutes")}</td>
        </tr>
        <tr>
          <td class="label">${locale === "ar" ? "المبلغ المتسلم رقمياً:" : "Montant:"}</td>
          <td class="value" style="color: #065f46; font-size: 14px; font-weight: 900;">${formatTND(income.amount, locale)}</td>
        </tr>
        <tr>
          <td class="label">${locale === "ar" ? "حروفاً وكتابة فقط لا غير:" : "Montant en lettres:"}</td>
          <td class="value" style="font-style: italic; color: #4b5563;">${amountInWords}</td>
        </tr>
        <tr>
          <td class="label">${locale === "ar" ? "طريقة الدفع الدفع:" : "Mode:"}</td>
          <td class="value">${methodLabel}</td>
        </tr>
        <tr>
          <td class="label">${locale === "ar" ? "القائد المستلم:" : "Reçu par:"}</td>
          <td class="value">${income.receivedByLeader || (locale === "ar" ? "أمين صندوق الفوج" : "Le Trésorier")}</td>
        </tr>
      </table>

      <div class="total-box">
        ${locale === "ar" ? "المبلغ المقبوض" : "MONTANT PERÇU"} : ${formatTND(income.amount, locale)}
      </div>

      <div class="signatures-row">
        <div class="signature-col">
          <div class="sig-title">${locale === "ar" ? "إمضاء المستلم" : "Signature"}</div>
          <div style="min-height: 45px;">${signatureContent}</div>
          <div class="sig-name" style="margin-top: 5px;">${income.receivedByLeader || (locale === "ar" ? "أمين الفوج" : "Le Trésorier")}</div>
        </div>
        <div class="signature-col" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="sig-title">${locale === "ar" ? "طابع الفوج الرسمي" : "Timbre du Groupe"}</div>
          <div style="position: absolute; bottom: 0;">${stampContent}</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Auto launch print dialog on open
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 400);
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docTitle}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = async () => {
    if (!printAreaRef.current) return;
    setIsGeneratingPDF(true);

    try {
      // 1. Generate the PDF
      const element = printAreaRef.current;
      
      // Use html2canvas to capture the receipt element
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: "#fdfdfa" // background color of receipt
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      
      // Create a PDF matching receipt proportions
      const widthMm = 140; // elegant scout receipt width
      const heightMm = (canvas.height * widthMm) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [widthMm, heightMm]
      });
      
      pdf.addImage(imgData, "JPEG", 0, 0, widthMm, heightMm);
      const pdfBlob = pdf.output("blob");
      
      const docTitle = locale === "ar" ? `وصل_استلام_${income.receiptNo}` : `Recu_Scout_${income.receiptNo}`;
      const pdfFile = new File([pdfBlob], `${docTitle}.pdf`, { type: "application/pdf" });

      // 2. Try to use web share API (supported on mobile iOS/Android/some browsers)
      let sharedSuccessfully = false;
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: locale === "ar" ? "وصل استلام مالي كشفي" : "Reçu de recouvrement scout",
            text: locale === "ar" ? `وصل استلام مالي كشفي رقم ${income.receiptNo} ⚜️` : `Reçu scout N ${income.receiptNo} ⚜️`
          });
          sharedSuccessfully = true;
        } catch (shareError) {
          console.warn("navigator.share failed or was blocked by sandbox iframe security:", shareError);
        }
      }

      if (!sharedSuccessfully) {
        // 3. Fallback: Download PDF to user device
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${docTitle}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        // Show instruction popup/info on how to share the downloaded file
        setShowPDFInstruction(true);
      }
    } catch (error) {
      console.error("Error generating or sharing PDF:", error);
      alert(locale === "ar" ? "فشل إنشاء ملف الـ PDF. جرب مرة أخرى." : "Échec de génération du PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
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
      <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-xl shadow-2xl border border-zinc-100 dark:border-zinc-850 flex flex-col overflow-hidden max-h-[92vh] relative animate-in fade-in zoom-in-95 duration-150">
        
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

        {/* Dynamic WhatsApp Instruction Overlay */}
        {showPDFInstruction && (
          <div className="bg-emerald-950/95 text-white p-6 flex flex-col items-center justify-center text-center absolute inset-0 z-40 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white/10 p-4 rounded-full mb-4">
              <Share2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="font-extrabold text-lg text-amber-400 mb-2">
              {locale === "ar" ? "تم توليد وتنزيل الوصل الكشفي الرسمي PDF! 📥" : "Reçu PDF officiel généré et téléchargé !"}
            </h4>
            <p className="text-xs text-zinc-200 leading-relaxed max-w-sm mb-6">
              {locale === "ar" 
                ? "لقد قمنا بتوليد وتنزيل الوصل كملف PDF عالي الجودة على جهازك. لإرساله الآن بكل سهولة لولي الأمر، اضغط على الزر أدناه لفتح واتساب ثم قم بسحب الملف وإسقاطه في المحادثة مباشرة."
                : "Nous avons généré et téléchargé le reçu PDF de haute qualité sur votre appareil. Pour l'envoyer au parent, cliquez sur le bouton ci-dessous pour ouvrir WhatsApp, puis glissez-déposez le fichier dans la discussion."}
            </p>
            
            {income.payerPhone && (
              <div className="bg-emerald-900/60 border border-emerald-800 rounded-xl px-4 py-2 text-2xs font-mono mb-6">
                {locale === "ar" ? "الهاتف المستهدف في واتساب:" : "Téléphone cible WhatsApp :"}{" "}
                <span className="font-bold text-amber-300">{income.payerPhone}</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => {
                  const phoneNum = income.payerPhone ? income.payerPhone.replace(/\s+/g, "") : "";
                  const cleanPhone = phoneNum.startsWith("+") ? phoneNum.substring(1) : phoneNum;
                  
                  // Friendly message welcoming them
                  const welcomeText = locale === "ar"
                    ? `⚜️ السلام عليكم، إليكم الوصل الكشفي الرسمي لرقم ${income.receiptNo} الخاص بكم كملف PDF مرفق (قم بسحب ملف PDF وتنزيله هنا):`
                    : `⚜️ Bonjour, voici votre reçu scout officiel N ${income.receiptNo} sous format PDF ci-joint (veuillez glisser-déposer le fichier PDF ici) :`;
                  
                  const url = cleanPhone
                    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(welcomeText)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(welcomeText)}`;
                  
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs"
              >
                <span>💬</span>
                <span>{locale === "ar" ? "فتح محادثة واتساب الآن" : "Ouvrir la discussion WhatsApp"}</span>
              </button>
              
              <button
                onClick={() => setShowPDFInstruction(false)}
                className="bg-transparent hover:bg-white/10 text-zinc-300 font-extrabold py-2 rounded-xl transition text-[11px] underline cursor-pointer"
              >
                {locale === "ar" ? "العودة لمعاينة ومراجعة الوصل" : "Retour à l'aperçu du reçu"}
              </button>
            </div>
          </div>
        )}

        {/* Action Bar Above Draft */}
        <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 border-b dark:border-zinc-850 flex flex-wrap gap-2.5 items-center justify-between text-2xs font-extrabold">
          <div className="flex flex-wrap gap-2 text-3xs sm:text-2xs font-bold text-center">
            <button
              onClick={handlePrint}
              className="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-3xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "معاينة الطباعة 🖨️" : "Aperçu Impression"}</span>
            </button>

            <button
              onClick={handleDownloadHTML}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-3xs cursor-pointer"
              title={locale === "ar" ? "تنزيل الوصل كملف مستقل ومطوّر لتفادي مشاكل الحظر للطباعة" : "Exporter le fichier HTML d'impression indépendant"}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{locale === "ar" ? "تصدير HTML للطباعة كـ PDF 📥" : "HTML Prêt à Imprimer"}</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              disabled={isGeneratingPDF}
              className={`${isGeneratingPDF ? "bg-zinc-500" : "bg-[#25D366] hover:bg-[#20ba5a]"} text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-3xs cursor-pointer disabled:cursor-not-allowed`}
              title={locale === "ar" ? "توليد ملف PDF وإرساله عبر واتساب" : "Générer et envoyer le reçu PDF sur WhatsApp"}
            >
              <Share2 className={`w-3.5 h-3.5 ${isGeneratingPDF ? "animate-spin" : ""}`} />
              <span>
                {isGeneratingPDF 
                  ? (locale === "ar" ? "جاري توليد PDF... ⏳" : "PDF en cours...")
                  : (locale === "ar" ? "مشاركة PDF واتساب 🟢" : "Partager PDF")}
              </span>
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
                  {locale === "ar" ? "الكشافة التونسية" : "Scouts Tunisiens"}
                </h4>
                <p className="text-[10px] text-zinc-550 font-bold">
                  {locale === "ar" ? (troopName ? `${troopName} / أمانة المال والعهد` : "فوج الكشافة / أمانة المال والعهد") : "Groupe Scout - Intendance Générale"}
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
                <div className="text-center w-[45%] flex flex-col items-center">
                  <p className="underline decoration-1 mb-2 text-zinc-500">
                    {locale === "ar" ? "إمضاء المستلم" : "Signature du récepteur"}
                  </p>
                  
                  {troopSignature ? (
                    <div className="h-[52px] flex items-center justify-center select-none mb-1">
                      <img 
                        src={troopSignature} 
                        alt="Signature" 
                        className="max-h-[50px] object-contain mix-blend-multiply dark:mix-blend-normal" 
                      />
                    </div>
                  ) : (
                    <div className="h-[52px] w-full flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded px-1.5 text-[8.5px] text-zinc-400 select-none mb-1">
                      {locale === "ar" ? "بلا إمضاء رسمي" : "Sans Signature"}
                    </div>
                  )}

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
