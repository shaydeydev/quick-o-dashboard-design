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
      {/* Capped and centered so PayPal sizes the button to the real container width */}
      <div className="mx-auto mt-3 w-full max-w-[420px]">
        <PayPalButtons
          style={{
            layout: "vertical",
            height: 45,
            color: "blue",
            shape: "pill",
            tagline: false,
            label: "paypal",
          }}
          forceReRender={[amount, itemTitle]}
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
              await actions.order.capture();
              if (onSuccess) onSuccess();
              alert(`🎉 Success! Order placed for ${itemTitle}.`);
            }
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}