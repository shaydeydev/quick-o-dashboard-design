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
      <div className="w-full mt-3 overflow-hidden rounded-xl bg-[#1c1924] border border-white/10 p-2.5 relative shadow-inner isolate [&_.paypal-buttons]:bg-[#1c1924] [&_iframe]:bg-[#1c1924]">
        <PayPalButtons
          style={{ 
            layout: "horizontal", 
            height: 40, 
            color: "blue", 
            shape: "pill",
            tagline: false,
            label: "pay"
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
              alert(`🎉 Success! Order placed for ${itemTitle}.`);
            }
          }}
        />
      </div>
    </PayPalScriptProvider>
  );
}