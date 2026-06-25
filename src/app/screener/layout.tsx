import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NSE Technical Stock Screener | Kaalchakra',
  description: 'Screen NSE India stocks based on technical rules, RSI, volume spikes, and SMA crossovers. Find historical support and resistance alignment zones.',
};

export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
