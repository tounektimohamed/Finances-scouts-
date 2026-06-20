import PDFDocument from "pdfkit";
import { Income } from "../types";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-TN", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function generateReceiptPDF(income: Income, troopName?: string): Buffer {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A5",
      layout: "portrait",
      margins: { top: 30, bottom: 30, left: 25, right: 25 },
      info: {
        Title: `Receipt ${income.receiptNo}`,
        Author: "Finances Scouts - الكشافة التونسية",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 50;
    const centerX = doc.page.width / 2;
    let y = 30;

    const primaryColor = "#065f46";
    const accentColor = "#f59e0b";
    const textColor = "#1f2937";

    // Helper: draw centered text
    const centerText = (text: string, size: number, color: string, yPos: number, weight?: string) => {
      doc.fontSize(size).fillColor(color);
      const width = doc.widthOfString(text);
      doc.text(text, centerX - width / 2, yPos, { align: "center" });
      return yPos + size + 4;
    };

    // Helper: label + value row
    const addRow = (label: string, value: string, yPos: number) => {
      doc.fontSize(10).fillColor("#6b7280").text(label, 25, yPos, { continued: true });
      doc.fontSize(11).fillColor(textColor).text(`  ${value}`, { align: "right" });
      return yPos + 18;
    };

    // === TOP DECORATION ===
    doc.rect(0, 0, doc.page.width, 8).fill(primaryColor);
    y += 16;

    // === HEADER ===
    doc.fontSize(16).fillColor(primaryColor);
    centerText("⚜", 20, accentColor, y);
    y += 22;

    doc.font("Helvetica-Bold").fontSize(14).fillColor(primaryColor);
    centerText("الكشافة التونسية", 14, primaryColor, y);
    y += 18;

    if (troopName) {
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
      centerText(troopName, 9, "#6b7280", y);
      y += 14;
    }

    doc.font("Helvetica").fontSize(9).fillColor("#6b7280");
    centerText("أمانة المال والعهد", 9, "#6b7280", y);
    y += 24;

    // === DIVIDER ===
    doc.moveTo(25, y).lineTo(doc.page.width - 25, y).strokeColor("#d1d5db").stroke();
    y += 18;

    // === TITLE ===
    doc.font("Helvetica-Bold").fontSize(12).fillColor(primaryColor);
    centerText("وصل استلام أموال كشفي", 12, primaryColor, y);
    y += 10;
    doc.font("Helvetica").fontSize(8).fillColor("#9ca3af");
    centerText(`رقم: ${income.receiptNo} | تاريخ: ${formatDate(income.date)}`, 8, "#9ca3af", y);
    y += 22;

    // === INFO TABLE ===
    const methodLabels: Record<string, string> = {
      cash: "نقداً",
      cheque: "شيك",
      transfer: "تحويل بنكي",
    };

    addRow("الجهة الدافعة:", income.payerName, y);
    addRow("السبب:", income.incomeReason || income.note || "اشتراكات كشفية", y);
    addRow("طريقة الدفع:", methodLabels[income.method] || income.method, y);
    addRow("المستلم:", income.receivedByLeader || "أمين صندوق الفوج", y);

    y += 14;

    // === AMOUNT BOX ===
    doc.roundedRect(35, y, pageWidth - 20, 36, 6).fillAndStroke("#f0fdf4", primaryColor);
    y += 9;

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280");
    const amountLabel = "المبلغ المقبوض";
    const amountLabelW = doc.widthOfString(amountLabel);
    doc.text(amountLabel, centerX - amountLabelW / 2, y, { align: "center" });

    doc.fontSize(16).fillColor(primaryColor);
    const amountStr = `${income.amount.toFixed(3)} د.ت`;
    const amountW = doc.widthOfString(amountStr);
    doc.text(amountStr, centerX - amountW / 2, y + 12, { align: "center" });

    y += 44;

    // === DIVIDER ===
    doc.moveTo(25, y).lineTo(doc.page.width - 25, y).strokeColor("#d1d5db").stroke();
    y += 18;

    // === FOOTER ===
    doc.font("Helvetica").fontSize(7).fillColor("#9ca3af");
    const footerText = "هذا الوصل معتمد من الكشافة التونسية - أمانة المال والعهد";
    centerText(footerText, 7, "#9ca3af", y);
    y += 10;
    centerText(`تاريخ الإنشاء: ${new Date().toISOString().split("T")[0]}`, 7, "#9ca3af", y);

    // === BOTTOM DECORATION ===
    doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill(primaryColor);

    doc.end();
  });
}
