import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Elite Life Clinic",
  description: "Elite Life Clinic Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
