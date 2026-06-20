import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Enable JSON body parsing with a generous size limit for receipt image uploads
app.use(express.json({ limit: "15mb" }));

// Initialize Google GenAI client lazily (so it doesn't crash if KEY is missing)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// 1. API: Analyze OCR receipt image
app.post("/api/ocr", async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Missing imageBase64 parameter" });
  }

  const client = getGeminiClient();

  if (!client) {
    // Elegant fallback simulation when Gemini API Key is not set or placeholder
    console.log("Gemini API key is not configured. Returning premium simulated OCR response.");
    // We can simulate an intelligent parser that returns values based on the action
    return res.json({
      success: true,
      simulated: true,
      data: {
        supplier: "المغازة العامة - تونس",
        totalAmount: 64.5,
        date: new Date().toISOString().split("T")[0],
        category: "nutrition",
        description: "شراء مستلزمات التغذية للمخيم (خضر وغلال وجبن)",
        confidence: 0.95,
        message: "تم توليد هذه البيانات افتراضياً لعدم تهيئة مفتاح الـ API لـ Gemini. يرجى إضافته في الإعدادات لتفعيل القراءة الحقيقية للفواتير."
      }
    });
  }

  try {
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType || "image/jpeg"
      }
    };

    const prompt = `Analyze this Tunisian Scout Camp expenditure receipt or invoice. 
Extract the key info in JSON format matching this schema:
{
  "supplier": "Name of the supplier or shop in Arabic",
  "totalAmount": numeric total amount of money in Tunisian Dinars (TND),
  "date": "Date of transaction (YYYY-MM-DD format if possible or human readable Arabic)",
  "category": "One of these specific lowercase English categories based on the purchase: 'nutrition', 'transport', 'lodging', 'activities', 'printing', 'health', 'media', 'misc'",
  "description": "Short description of items bought in Arabic"
}
Provide strictly JSON output with NO markdown wrapper blocks or formatting besides the JSON itself. If certain fields cannot be detected, attempt a reasonable guess based on visible text, or leave as empty string/0.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplier: { type: Type.STRING, description: "Name of store or supplier" },
            totalAmount: { type: Type.NUMBER, description: "Sum total of invoice in Dinars" },
            date: { type: Type.STRING, description: "YYYY-MM-DD formatted or friendly date" },
            category: { 
              type: Type.STRING, 
              description: "One of: nutrition, transport, lodging, activities, printing, health, media, misc" 
            },
            description: { type: Type.STRING, description: "Arabic item summary" }
          },
          required: ["supplier", "totalAmount", "category", "description"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const resultData = JSON.parse(text);

    return res.json({
      success: true,
      simulated: false,
      data: resultData
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    return res.status(500).json({ 
      error: "فشل في معالجة الفاتورة عبر الذكاء الاصطناعي",
      details: error.message 
    });
  }
});

// 2. API: Parse vocal or written financial narration
app.post("/api/parse-command", async (req, res) => {
  const { commandText } = req.body;

  if (!commandText) {
    return res.status(400).json({ error: "Missing commandText parameter" });
  }

  const client = getGeminiClient();

  if (!client) {
    console.log("Gemini API key is not configured. Returning simulated parsed voice command.");
    // Simulated intelligent parsing based on keywords
    const lowerText = commandText.toLowerCase();
    let type = "expense";
    let category = "misc";
    let amount = 10;
    let label = commandText;

    if (commandText.includes("اشتراك") || commandText.includes("دفع") || commandText.includes("مداخيل") || commandText.includes("تبرع")) {
      type = "income";
    }

    // Amount extraction
    const amountMatch = commandText.match(/\d+/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[0]);
    }

    // Category detection
    if (commandText.includes("خبز") || commandText.includes("أكل") || commandText.includes("فطور") || commandText.includes("لحم") || commandText.includes("خضر") || commandText.includes("ماء")) {
      category = "nutrition";
      label = "شراء مستلزمات التغذية";
    } else if (commandText.includes("حافلة") || commandText.includes("مازوط") || commandText.includes("كراء حافلة") || commandText.includes("نقل") || commandText.includes("تاكسي")) {
      category = "transport";
      label = "مصاريف النقل";
    } else if (commandText.includes("خيمة") || commandText.includes("إيواء") || commandText.includes("ملعب") || commandText.includes("دار شباب")) {
      category = "lodging";
      label = "مصاريف الإيواء";
    } else if (commandText.includes("ورق") || commandText.includes("أدوات") || commandText.includes("ألعاب") || commandText.includes("نشاط")) {
      category = "activities";
      label = "أدوات أنشطة";
    }

    return res.json({
      success: true,
      simulated: true,
      data: {
        type,
        category,
        amount,
        label,
        note: `نص مفسر تلقائياً: "${commandText}" (تفعيل مفتاح API يعطي نتائج دقيقة جداً)`
      }
    });
  }

  try {
    const prompt = `You are a financial transactions Parser for a Tunisian Scout Camp. Interpret the user's spoken or typed Tunisian Arabic dialect / classical Arabic statement into a structured ledger action.
If the statement is a cost/expense: type must be 'expense'. If it is a revenue/income/payment into the ledger: type must be 'income'.
Map the category for expenses to one of the following lowercase values: 'nutrition', 'transport', 'lodging', 'activities', 'printing', 'health', 'media', 'misc'.
Map the income type for incomes to one of: 'participation', 'grant', 'donation', 'activity'.
Extract the financial amount in Tunisian Dinars (TND) as a number.
Formulate a clean short title/label for the transaction in proper Arabic.

Statement to interpret: "${commandText}"

Provide response in JSON matching this schema:
{
  "type": "expense" or "income",
  "category": "lowercase string for expense category, or 'misc' if income",
  "incomeType": "lowercase string for income type like 'participation', 'grant', 'donation', 'activity', or 'none' if expense",
  "amount": numeric amount in TND,
  "label": "Short transaction title in Arabic",
  "note": "Any additional extracted details like people mentioned, quantities etc in Arabic"
}`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "expense or income" },
            category: { type: Type.STRING, description: "Category of cost (lowercase)" },
            incomeType: { type: Type.STRING, description: "Type of income (lowercase)" },
            amount: { type: Type.NUMBER, description: "Numeric amount in TND" },
            label: { type: Type.STRING, description: "Unified short Arabic title" },
            note: { type: Type.STRING, description: "Extracted context/details" }
          },
          required: ["type", "amount", "label"]
        }
      }
    });

    const text = response.text ? response.text.trim() : "{}";
    const resultData = JSON.parse(text);

    return res.json({
      success: true,
      simulated: false,
      data: resultData
    });

  } catch (error: any) {
    console.error("Parse command API error:", error);
    return res.status(500).json({ 
      error: "فشل في معالجة الأمر الصوتي/النصي",
      details: error.message 
    });
  }
});

// 3. API: Generate and send receipt PDF via WhatsApp
app.post("/api/send-receipt", async (req, res) => {
  const { incomeId, phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Missing phone parameter" });
  }

  try {
    const { generateReceiptPDF } = await import("./src/lib/pdfReceipt.ts");
    const { sendReceiptViaWhatsApp } = await import("./src/lib/whatsapp.ts");

    const { db } = await import("./src/lib/firebase.ts");
    const { getDoc, doc } = await import("firebase/firestore");

    const incSnap = await getDoc(doc(db, "incomes", incomeId));
    if (!incSnap.exists()) {
      return res.status(404).json({ error: "Income not found" });
    }

    const incomeData = { id: incSnap.id, ...incSnap.data() } as any;
    const troopName = process.env.TROOP_NAME || "فوج الكشافة";

    const pdfBuffer = await generateReceiptPDF(incomeData, troopName);
    const pdfBase64 = pdfBuffer.toString("base64");
    const fileName = `Reçu_Scout_${incomeData.receiptNo || incomeId}.pdf`;
    const caption = `⚜️ وصل استلام كشفي رقم ${incomeData.receiptNo || ""} - ${incomeData.payerName || ""}`;

    const result = await sendReceiptViaWhatsApp({ phone, pdfBase64, fileName, caption });
    return res.json(result);
  } catch (error: any) {
    console.error("Send receipt error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Serve frontend assets or configure Vite dev mode middleware
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Scout Finance Tracker Server] Running at http://localhost:${PORT}`);
  });
}

setupServer();
