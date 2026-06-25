import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Descriptive Setup Backtester & Pattern Library | Kaalchakra',
  description: 'Analyze historical frequency statistics, occurrence counts, and average forward returns for rule-based Gann-planetary setups.',
};

export default function PatternLibraryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
