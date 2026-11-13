import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your account - Ableway',
  description: 'Create your accessible Ableway account using voice or keyboard.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

