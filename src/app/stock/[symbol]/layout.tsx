import { Metadata } from 'next';

type Props = {
  params: { symbol: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: { params: { symbol: string } }): Promise<Metadata> {
  const symbol = params.symbol.toUpperCase();
  return {
    title: `${symbol} Stock Chart, Gann Levels & Planetary Timing | Kaalchakra`,
    description: `Track mathematical Gann levels, support/resistance zones, and geocentric astronomical retrograde/ingress alignments for ${symbol} stock.`,
  };
}

export default function StockLayout({ children }: Props) {
  return <>{children}</>;
}
