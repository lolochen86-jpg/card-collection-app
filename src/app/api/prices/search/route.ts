import { NextRequest, NextResponse } from "next/server";

interface SearchBody {
  player: string;
  year?: number;
  brand?: string;
  cardNumber?: string;
  parallel?: string;
}

// Server-side eBay Oauth token fetch — API keys never reach the client
async function getEbayToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error("eBay credentials not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
  });
  if (!res.ok) throw new Error("Failed to get eBay token");
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchBody = await req.json();
    const { player, year, brand, cardNumber, parallel } = body;

    const query = [player, year, brand, cardNumber, parallel]
      .filter(Boolean)
      .join(" ");

    // Try eBay Browse API first
    try {
      const token = await getEbayToken();
      const ebayRes = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query + " baseball card")}&category_ids=212&limit=10&filter=conditionIds:{1000|1500|2000|2500|3000}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
        }
      );

      if (ebayRes.ok) {
        const ebayData = await ebayRes.json();
        const items = ebayData.itemSummaries ?? [];
        if (items.length > 0) {
          // Average the top 5 prices converted to TWD (approx 32 TWD = 1 USD)
          const prices = items
            .slice(0, 5)
            .map((i: { price?: { value?: string } }) => parseFloat(i.price?.value ?? "0") * 32)
            .filter((p: number) => p > 0);

          const avg = prices.length > 0
            ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length)
            : 0;

          return NextResponse.json({
            price: avg,
            source: "eBay (近期成交均價)",
            url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query + " baseball card")}`,
          });
        }
      }
    } catch {
      // eBay failed, fall through to mock
    }

    // Fallback: return placeholder so UI still works during development
    return NextResponse.json({
      price: 0,
      source: "無法取得價格（請設定 eBay API 金鑰）",
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
