import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 pt-6 sm:pt-8">
        <I18nLink href="/" className="inline-flex">
          <Logo size={28} />
        </I18nLink>
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
