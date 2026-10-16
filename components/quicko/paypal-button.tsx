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
        {/* Larger button container with precise bottom inset cropping */}
        <div 
          className="w-full flex justify-center overflow-hidden rounded-xl"
          style={{ clipPath: "inset(2px 2px 5px 2px round 12px)" }}
        >
          <PayPalButtons
            style={{ 
              layout: "horizontal", 
              height: 48, 
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