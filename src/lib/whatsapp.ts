const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || "ultramsg";

export interface SendReceiptParams {
  phone: string;
  pdfBase64: string;
  fileName: string;
  caption?: string;
}

export async function sendReceiptViaWhatsApp(params: SendReceiptParams): Promise<{ success: boolean; message: string }> {
  if (!params.phone) {
    return { success: false, message: "Numéro de téléphone manquant" };
  }

  const cleanPhone = params.phone.replace(/[\s\+]/g, "");

  if (WHATSAPP_PROVIDER === "ultramsg" && WHATSAPP_API_URL && WHATSAPP_API_KEY) {
    return sendUltraMsg(cleanPhone, params.pdfBase64, params.fileName, params.caption);
  }

  if (WHATSAPP_PROVIDER === "generic" && WHATSAPP_API_URL) {
    return sendGeneric(cleanPhone, params);
  }

  // No provider configured - log and return info
  console.log(`[WhatsApp] Envoi simulé vers ${cleanPhone}: ${params.fileName}`);
  return {
    success: true,
    message: `WhatsApp non configuré. Le PDF (${params.fileName}) serait envoyé au ${cleanPhone}. Ajoutez WHATSAPP_API_URL et WHATSAPP_API_KEY dans .env.`,
  };
}

async function sendUltraMsg(phone: string, pdfBase64: string, fileName: string, caption?: string): Promise<{ success: boolean; message: string }> {
  try {
    const base64Data = pdfBase64.includes("base64,") ? pdfBase64.split("base64,")[1] : pdfBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("token", WHATSAPP_API_KEY);
    formData.append("to", phone);
    formData.append("filename", fileName);
    formData.append("document", new Blob([buffer], { type: "application/pdf" }), fileName);
    formData.append("caption", caption || `وصل استمال كشفي - ${fileName}`);

    const response = await fetch(`${WHATSAPP_API_URL}/messages/document`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.status === "sent" || data.sent) {
      return { success: true, message: "PDF envoyé avec succès via WhatsApp" };
    }
    return { success: false, message: data.description || data.error || "Erreur d'envoi WhatsApp" };
  } catch (error: any) {
    console.error("[UltraMsg] Erreur:", error);
    return { success: false, message: error.message || "Erreur de connexion WhatsApp" };
  }
}

async function sendGeneric(phone: string, params: SendReceiptParams): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WHATSAPP_API_KEY ? { Authorization: `Bearer ${WHATSAPP_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        phone,
        pdfBase64: params.pdfBase64,
        fileName: params.fileName,
        caption: params.caption,
      }),
    });

    const data = await response.json();
    return { success: true, message: "PDF envoyé avec succès" };
  } catch (error: any) {
    console.error("[Generic WhatsApp] Erreur:", error);
    return { success: false, message: error.message || "Erreur d'envoi" };
  }
}
