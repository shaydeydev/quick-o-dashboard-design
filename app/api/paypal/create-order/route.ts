import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { amount, item } = await req.json();

    return NextResponse.json({
      id: "MOCK-PAYPAL-ORDER-" + Date.now(),
      status: "CREATED",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: amount || "329.00" },
          description: item || "QuickO Smart Purchase",
        },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}