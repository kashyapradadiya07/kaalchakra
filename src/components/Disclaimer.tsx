import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <footer className="w-full bg-slate-900/80 border-t border-slate-800 text-slate-400 py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-slate-300">
            Regulatory & Educational Disclaimer
          </p>
          <p className="text-xs leading-relaxed max-w-5xl">
            This tool is for educational and informational purposes only. It does not constitute investment advice. We are not a SEBI-registered Investment Adviser or Research Analyst. All price calculations, pattern suggestions, and Gann levels are based on deterministic historical formulas and are for research observations only. Never place orders or execute trades based on these numbers.
          </p>
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} Kaalchakra. All rights reserved. Built strictly for educational and analytical study of financial markets.
          </p>
        </div>
      </div>
    </footer>
  );
}
