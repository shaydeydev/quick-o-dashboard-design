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
            color: "blue", 
            shape: "pill" 
          }}
          createOrder={(data, actions) => {
            return actions.order.create({
              intent: "CAPTURE",
              purchase_units: [
                {
                  amount: {
                    currency_code: "USD",
                    value: amount,
                  },
                  description: itemTitle,
                },
              ],
            });
          }}
          onApprove={async (data, actions) => {
            if (actions.order) {
              const details = await actions.order.capture();
              if (onSuccess) onSuccess();
              alert(`🎉 Success! Transaction completed for ${itemTitle}.`);
            }
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}