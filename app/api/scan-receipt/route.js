import { NextResponse } from "next/server";

export async function POST(request) {
  console.log("--- SCANNING RECEIPT API CALLED (v1-latest) ---");
  try {
    const { image, mimeType = "image/jpeg" } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
      return NextResponse.json(
        { success: false, error: "Gemini API key not configured. Add GEMINI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    // Strip data-url prefix if present
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const prompt = `You are a receipt OCR system. Analyze this receipt image and extract structured data.

Return ONLY valid JSON in this exact format, with no markdown, no code fences, no extra text:
{
  "merchant": "Store or restaurant name",
  "date": "YYYY-MM-DD or null if unreadable",
  "items": [
    { "name": "Item name", "price": 0.00 },
    { "name": "Item name", "price": 0.00 }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00,
  "currency": "INR"
}

Rules:
- All prices must be numbers, not strings
- If the receipt uses ₹ or Rs, set currency to "INR"
- If the receipt uses $ set currency to "USD"
- If you cannot read the total, sum the items
- If items cannot be identified individually, create a single item with the total
- If this is NOT a receipt, return: {"error": "This does not appear to be a receipt"}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API error detail:", geminiResponse.status, errorBody);
      return NextResponse.json(
        { success: false, error: `Gemini API error ${geminiResponse.status}: ${errorBody.substring(0, 100)}` },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini API call successful");

    // Extract text from Gemini response
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "No response from Gemini" },
        { status: 502 }
      );
    }

    // Clean up the response - strip markdown code fences if present
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", cleanedText);
      return NextResponse.json(
        { success: false, error: "Failed to parse receipt data. Try a clearer image." },
        { status: 422 }
      );
    }

    // Check if Gemini flagged it as not a receipt
    if (parsed.error) {
      return NextResponse.json(
        { success: false, error: parsed.error },
        { status: 422 }
      );
    }

    // Validate & sanitize
    const receipt = {
      merchant: parsed.merchant || "Unknown",
      date: parsed.date || null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({
            name: String(item.name || "Item"),
            price: Number(item.price) || 0,
          }))
        : [],
      subtotal: Number(parsed.subtotal) || 0,
      tax: Number(parsed.tax) || 0,
      total: Number(parsed.total) || 0,
      currency: parsed.currency || "INR",
    };

    // Fallback: if total is 0, sum items
    if (receipt.total === 0 && receipt.items.length > 0) {
      receipt.total = receipt.items.reduce((sum, i) => sum + i.price, 0);
    }

    return NextResponse.json({ success: true, data: receipt });
  } catch (err) {
    console.error("Receipt scan error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
