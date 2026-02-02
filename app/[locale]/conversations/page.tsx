import { setRequestLocale } from 'next-intl/server';
import ConversationsClient from '@/components/ConversationsClient';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ConversationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ConversationsClient />;
}
