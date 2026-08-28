import { notFound } from 'next/navigation';
import { PdfCargaPreviewClient } from './PdfCargaPreviewClient';

export const metadata = {
  title: 'Preview · PDF Dinâmica de Carga · Coach Vinny',
  robots: { index: false, follow: false },
};

export default function PdfCargaPreviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <PdfCargaPreviewClient />;
}
