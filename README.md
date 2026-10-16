⚡ QuickO — 1-Click Agentic Checkout & Subscription Manager
QuickO is an AI-powered shopping and subscription management agent designed to streamline online purchases and eliminate checkout friction. Built with a sleek dark-mode glassmorphism UI, QuickO combines live price discovery, intelligent subscription protection, and a seamless 1-Click PayPal Checkout experience.

🌐 Live Demo: https://quick-o-dashboard-design.vercel.app

✨ Key Features
🤖 Interactive AI Agent Prompt: Natural language command handling supporting voice and text inputs, backed by live intent matching for product lookups and order flows.

💳 1-Click PayPal Integration: Fully optimized @paypal/react-paypal-js implementation resolving dark-theme container artifacts, iframe styling, and secure sandbox transactions.

☕ Interactive Order Workflows: Custom in-chat cards for rapid actions (e.g., ordering Starbucks drinks with size selection, or price-matching electronics like the GeForce RTX 4060 Ti and AirPods Pro 2).

🛡️ Subscription Protection: Automatically analyzes your PayPal balance and pauses low-priority subscriptions to protect vital monthly services.

🛠️ Tech Stack
Framework: Next.js 14 (App Router)

Styling: Tailwind CSS, Lucide Icons, Glassmorphism

Payments: @paypal/react-paypal-js

Deployment: Vercel

🚀 Running Locally
Clone the repository: git clone [https://github.com/your-username/quick-o-dashboard-design.git](https://github.com/your-username/quick-o-dashboard-design.git) and cd quick-o-dashboard-design.

Install dependencies: npm install.

Set up environment variables: Create a .env.local file in the root directory and add your PayPal Client ID (NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here).

Run the development server: npm run dev.

Open http://localhost:3000 in your browser.
