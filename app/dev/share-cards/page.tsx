import { notFound } from 'next/navigation';
import { ShareCardsPreviewClient } from './ShareCardsPreviewClient';

export const metadata = {
  title: 'Preview · Cards compartilháveis · Coach Vinny',
  robots: { index: false, follow: false },
};

export default function ShareCardsPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <ShareCardsPreviewClient />;
}
