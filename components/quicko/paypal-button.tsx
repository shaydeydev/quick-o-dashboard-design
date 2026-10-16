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
      <div className="w-full mt-3 rounded-2xl bg-[#1c1924] border border-white/10 p-1.5 relative shadow-inner overflow-hidden">
        {/* Forces full width and removes white background from internal iframe elements */}
        <style jsx global>{`
          .paypal-buttons, 
          .paypal-buttons iframe {
            width: 100% !important;
            min-width: 100% !important;
            background-color: transparent !important;
          }
        `}</style>
        
        <div className="w-full overflow-hidden rounded-xl bg-[#1c1924]">
          <PayPalButtons
            style={{ 
              layout: "horizontal", 
              height: 55, 
              color: "blue", 
              shape: "rect",
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