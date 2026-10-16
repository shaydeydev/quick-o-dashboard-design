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
      <div className="w-full mt-3 rounded-xl bg-[#1c1924] border border-white/10 p-2.5 relative shadow-inner flex justify-center items-center">
        {/* clip-path inset physically crops out the iframe's rogue white corners */}
        <div 
          className="overflow-hidden rounded-xl"
          style={{ clipPath: "inset(3px round 10px)" }}
        >
          <PayPalButtons
            style={{ 
              layout: "horizontal", 
              height: 40, 
              color: "blue", 
              shape: "pill",
              tagline: false,
              label: "paypal"
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
                await actions.order.capture();
                if (onSuccess) onSuccess();
                alert(`🎉 Success! Order placed for ${itemTitle}.`);
              }
            }}
          />
        </div>
      </div>
    </PayPalScriptProvider>
  );
}