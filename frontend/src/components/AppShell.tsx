import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';
import { routePaths } from '../navigation';

type NavItem = { id: string; label: string; sub: string; icon: ReactNode };

/** Haven-inspired presentation shell. Financial state stays in the application. */
export default function AppShell({ page, onNavigate, items, healthy, children }: {
  page: string;
  onNavigate: (page: string) => void;
  items: NavItem[];
  healthy: boolean;
  children: ReactNode;
}) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  function navigate(next: string) {
    onNavigate(next);
    setOpen(false);
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  return <div className="app-shell haven-theme">
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>{t('跳到主要内容')}</a>
    <header className="site-header">
      <div className="site-nav">
        <a className="site-brand" href="#/calculator" onClick={(event) => { event.preventDefault(); navigate('overview'); }}>
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="currentColor" />
            <path d="M9 21 20 11l11 10v9H9zM17 30v-6h6v6" fill="none" stroke="#c8a15a" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
          <span><strong>{t('衡居')}</strong><small>HOMEWISE</small></span>
        </a>
        <button ref={toggle} type="button" className="menu-toggle" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? t('关闭导航') : t('打开导航')} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
        <nav id="primary-navigation" className={`primary-navigation ${open ? 'is-open' : ''}`} aria-label={t('主导航')}>
          {items.map((item) => <a href={`#${routePaths[item.id]}`} key={item.id} className={page === item.id ? 'is-active' : ''} aria-current={page === item.id ? 'page' : undefined} onClick={(event) => { if (!event.ctrlKey && !event.metaKey) { event.preventDefault(); navigate(item.id); } }}>
            <span className="navigation-icon" aria-hidden="true">{item.icon}</span>{item.label}
          </a>)}
        </nav>
        <div className="language-switch" role="group" aria-label="Language / 语言">
          <button type="button" aria-label="切换为中文" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>中文</button>
          <button type="button" aria-label="Switch to English" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
        </div>
      </div>
    </header>
    <div className="workspace-strip">
      <div><span>{t('宁波 · 住房贷款与个人所得税联合计算器')}</span><span className="engine-state"><i className={healthy ? 'connected' : ''} />{healthy ? t('计算服务已连接') : t('正在连接计算引擎')}</span></div>
    </div>
    <main ref={main} id="main-content" className="main-content" tabIndex={-1}>{children}</main>
    <footer className="site-footer">
      <div className="footer-inner"><div><strong>{t('住房贷款与个人所得税联合计算器')}</strong><p>{t('宁波政策情景 · 工资收入 · 住房公积金 · 贷款方案')}</p></div><div><b>HOMEWISE · GRP P01</b><p><a href="#/policies" onClick={(e)=>{e.preventDefault();navigate('policy');}}>{t('政策与计算方法')}</a> · <a href="#/help" onClick={(e)=>{e.preventDefault();navigate('project');}}>{t('使用帮助')}</a></p><small>{t('结果基于所选政策版本、用户确认参数及明确的计算假设。')}</small></div></div>
      <div className="footer-credit">GRP P01 <span>Haven design by ZumaTools · <a href={`${import.meta.env.BASE_URL}templates/haven/LICENSE.txt`} target="_blank" rel="noreferrer">MIT License</a></span></div>
    </footer>
  </div>;
}
