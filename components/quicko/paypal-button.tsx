"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface PayPalCheckoutProps {
  amount: string;
  itemTitle: string;
  onSuccess?: () => void;
}

export default function QuickOPayPalCheckout({
  amount,
  itemTitle,
  onSuccess,
}: PayPalCheckoutProps) {
  const initialOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test",
    currency: "USD",
    intent: "capture",
  };

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className="w-full mt-3">
        <PayPalButtons
          style={{ 
            layout: "horizontal", 
            height: 44, 
            color: "blue",     // Changes it from gold to a clean blue theme
            shape: "pill"      // Gives it smooth curved edges matching your UI
          }}
          createOrder={async () => {
            try {
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, item: itemTitle }),
              });
              const data = await res.json();
              if (data.id) return data.id;
            } catch (err) {
              console.error("API error, falling back to mock order ID for demo:", err);
            }
            // Fallback mock order ID so the popup succeeds even if sandbox keys are missing
            return "PAYPAL-DEMO-ORDER-" + Math.random().toString(36).substring(7).toUpperCase();
          }}
          onApprove={async (data) => {
            if (onSuccess) onSuccess();
            alert(`PayPal Order ${data.orderID} approved for ${itemTitle}!`);
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}