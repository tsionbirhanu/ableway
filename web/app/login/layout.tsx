import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Ableway",
  description:
    "Sign in to your Ableway account. Password-free accessible login with one-time code.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
