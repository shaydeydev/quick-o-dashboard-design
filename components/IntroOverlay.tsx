'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, Camera, ArrowRight } from 'lucide-react';

export default function IntroOverlay() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0c0d11]/80 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-6 text-center">
              <span className="inline-block rounded-full bg-[#8266d2]/10 px-3 py-1 text-xs font-semibold text-[#8266d2] border border-[#8266d2]/20 mb-3">
                Nebius x NVIDIA Hackathon Edition
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Welcome to <span className="text-[#8266d2]">QuickO</span>
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Autonomous Physical & Digital Commerce Agent
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <div className="rounded-2xl border border-white/5 bg-[#17181f]/40 p-5 text-center transition-colors hover:border-[#8266d2]/30">
                <Zap className="mx-auto h-7 w-7 text-[#8266d2] mb-3" />
                <h3 className="text-sm font-semibold text-white">1-Command Deals</h3>
                <p className="mt-1 text-xs text-slate-400">Powered by Tavily search and Nebius AI reasoning.</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#17181f]/40 p-5 text-center transition-colors hover:border-[#8266d2]/30">
                <ShieldCheck className="mx-auto h-7 w-7 text-[#8266d2] mb-3" />
                <h3 className="text-sm font-semibold text-white">Subscription Guard</h3>
                <p className="mt-1 text-xs text-slate-400">Proactively blocks unwanted recurring charges.</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#17181f]/40 p-5 text-center transition-colors hover:border-[#8266d2]/30">
                <Camera className="mx-auto h-7 w-7 text-[#8266d2] mb-3" />
                <h3 className="text-sm font-semibold text-white">Physical AI Scanner</h3>
                <p className="mt-1 text-xs text-slate-400">Local model scanning to price-match real-world items.</p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setIsOpen(false)}
                className="group relative flex items-center gap-2 rounded-xl bg-[#8266d2] px-10 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#917ad8] hover:shadow-lg hover:shadow-[#8266d2]/25 active:scale-95 cursor-pointer"
              >
                Launch Agent
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}