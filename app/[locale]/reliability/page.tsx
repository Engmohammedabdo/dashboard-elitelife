import { setRequestLocale } from 'next-intl/server';
import ReliabilityClient from '@/components/ReliabilityClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ReliabilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ReliabilityClient />;
}
