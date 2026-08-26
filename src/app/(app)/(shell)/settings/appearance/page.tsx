import { ThemeSettings } from "../ThemeSettings";

export const metadata = { title: "Appearance Settings" };

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-xl">
      <h2 className="mb-6 font-display text-[20px] font-semibold">Appearance</h2>
      <ThemeSettings />
    </div>
  );
}
