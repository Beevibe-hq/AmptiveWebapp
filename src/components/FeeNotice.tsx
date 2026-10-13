import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

/** A quiet, inline note explaining Amptive's fees where creators set prices or withdraw. */
export function FeeNotice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-[13px] leading-relaxed text-blue-900 ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
