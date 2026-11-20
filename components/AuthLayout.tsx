import { ThemeToggle } from "./ThemeToggle";

type Props = {
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
};

export function AuthLayout({ eyebrow, title, lede, children }: Props) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <p className="auth-brand"><span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-sm"><img src="/ralogo-mark.png" alt="" className="h-full w-full object-contain" /></span><span>Realty Adwise</span></p>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-lede">{lede}</p>
        </div>
        <p className="auth-foot">Andheri West, Mumbai</p>
      </aside>
      <main className="auth-main">
        <ThemeToggle className="auth-theme" tip="tip-left" />
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
