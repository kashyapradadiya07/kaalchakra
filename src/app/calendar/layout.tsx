import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planetary Ephemeris & Astronomical Timing Calendar | Kaalchakra',
  description: 'Track geocentric longitudes, retrograde stations, sign ingresses, and solar/lunar eclipse events for the classical planets.',
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
