import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing Plans & Billing Portal | Kaalchakra',
  description: 'Manage your Kaalchakra subscription, unlock the Astro Ephemeris Module, and activate premium AI observations.',
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
