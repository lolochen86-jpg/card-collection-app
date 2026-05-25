import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI 辨識功能未設定" }, { status: 503 });
  }

  let imageBase64: string;
  let mimeType: string;

  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";
    if (!imageBase64) throw new Error("missing imageBase64");
  } catch {
    return NextResponse.json({ error: "無效的請求格式" }, { status: 400 });
  }

  const prompt = `You are a sports card expert. Analyze this trading card image and extract the following details in JSON format.

Return ONLY a valid JSON object with these fields (use null for any field you cannot determine):
{
  "player": string | null,
  "team": string | null,
  "year": number | null,
  "brand": string | null,
  "series": string | null,
  "cardNumber": string | null,
  "parallel": string | null,
  "condition": "raw" | "PSA" | "BGS" | "SGC" | "CGC" | null,
  "grade": number | null,
  "sport": string | null
}

Guidelines:
- "player": Full player name as printed on the card
- "team": Team abbreviation or full name
- "year": 4-digit year from the card
- "brand": Card manufacturer (e.g. Topps, Panini, Upper Deck, Bowman)
- "series": Product line (e.g. Chrome, Prizm, Select, Heritage)
- "cardNumber": Card number including # prefix if shown
- "parallel": Parallel variant name and print run if visible (e.g. "Gold Refractor /50", "Silver Prizm")
- "condition": Only set if the card is in a grading company case; otherwise "raw"
- "grade": Numeric grade if graded (e.g. 9.5, 10)
- "sport": e.g. "Baseball", "Basketball", "Football", "Soccer"

Return ONLY the JSON object, no other text.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from the response (handle any surrounding whitespace/markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "無法解析 AI 回應" }, { status: 502 });
    }

    const cardData = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data: cardData });
  } catch (err) {
    console.error("Card recognition error:", err);
    return NextResponse.json({ error: "AI 辨識失敗，請稍後再試" }, { status: 500 });
  }
}
