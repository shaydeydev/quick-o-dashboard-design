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
          style={{ layout: "horizontal", height: 40, color: "gold", shape: "rect" }}
          createOrder={async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount, item: itemTitle }),
            });
            const data = await res.json();
            return data.id;
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