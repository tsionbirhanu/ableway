import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Choose a course - Ableway',
  description: 'Choose your accessible course: Data Analytics, WR 100 Communication, and VA-1 Virtual Assistant.',
};

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

