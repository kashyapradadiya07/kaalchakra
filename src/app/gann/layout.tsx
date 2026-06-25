import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'W.D. Gann Square of 9 Calculator | Kaalchakra',
  description: 'Calculate mathematical price support and resistance zones using the classic W.D. Gann Square of 9 algorithm and geocentric degree vibrations.',
};

export default function GannLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
