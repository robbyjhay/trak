import type { Metadata } from "next";
import { Migration } from "@/components/Migration";
import { NEW_TRAK_LOGIN_URL } from "@/lib/migration";

export const metadata: Metadata = {
  title: "TRAK has moved",
  description: `TRAK has moved to ${NEW_TRAK_LOGIN_URL}. Sign in with your existing TRAK credentials.`,
  robots: { index: false, follow: false },
};

export default function MigrationPage() {
  return <Migration />;
}
