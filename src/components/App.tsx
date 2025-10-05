'use client';
import { useEffect, useMemo, useState } from 'react';
import Controls from './Controls';
import TripRows from './TripRows';
import data from '../data/timetable.sample.json';
import { trackEvent } from '../lib/analytics';

type AppProps = {
  initialNowIso: string;
  initialDirection?: 'sakai_to_tokyo'|'tokyo_to_sakai';
  initialTokyoStop?: 'oji'|'tokyo';
  currentView?: 'overview'|'sakai_to_tokyo'|'tokyo_to_sakai';
};

const withBasePath = (slug: string) => {
  const base = import.meta.env.PUBLIC_BASE_PATH ?? '/';
  const normalizedBase = base === '/' ? '' : base.replace(/\/$/, '');
  const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`;
  return `${normalizedBase}${normalizedSlug}` || '/';
};

export default function App({
  initialNowIso,
  initialDirection = 'sakai_to_tokyo',
  initialTokyoStop = 'oji',
  currentView = 'overview'
}: AppProps){
  const [direction,setDirection] = useState<'sakai_to_tokyo'|'tokyo_to_sakai'>(initialDirection);
  const [tokyoStop,setTokyoStop] = useState<'oji'|'tokyo'>(initialTokyoStop);
  const [nowValue,setNowValue]   = useState<string>('');

  const routes = (data as any).routes as any[];
  const trips  = useMemo(()=> direction==='sakai_to_tokyo'
    ? (routes.find(r=>r.id==='sakai_to_tokyo')?.trips ?? [])
    : (routes.find(r=>r.id==='tokyo_to_sakai')?.trips ?? [])
  ,[direction]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('sbm:user-preferences');
      if (!stored) return;
      const prefs = JSON.parse(stored);
      if (prefs.direction === 'sakai_to_tokyo' || prefs.direction === 'tokyo_to_sakai') {
        setDirection(prefs.direction);
      }
      if (prefs.tokyoStop === 'oji' || prefs.tokyoStop === 'tokyo') {
        setTokyoStop(prefs.tokyoStop);
      }
      if (typeof prefs.nowValue === 'string') {
        setNowValue(prefs.nowValue);
      }
    } catch (error) {
      console.warn('[prefs] failed to load', error);
    }
    if (!localStorage.getItem('sbm:user-preferences')) {
      const current = new Date();
      const hh = current.getHours().toString().padStart(2, '0');
      const mm = current.getMinutes().toString().padStart(2, '0');
      setNowValue(`${hh}:${mm}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      direction,
      tokyoStop,
      nowValue
    };
    try {
      localStorage.setItem('sbm:user-preferences', JSON.stringify(payload));
    } catch (error) {
      console.warn('[prefs] failed to persist', error);
    }
  }, [direction, tokyoStop, nowValue]);

  const note = (data as any).calendar?.note ?? '';

  return (
    <>
      <header className="container">
        <h1>境町 ↔ 東京 高速バス</h1>
        <nav className="route-links" aria-label="路線ページ">
          <a className={currentView==='overview' ? 'route-link is-active' : 'route-link'} href={withBasePath('/') }>
            総合
          </a>
          <a className={currentView==='sakai_to_tokyo' ? 'route-link is-active' : 'route-link'} href={withBasePath('/sakai-to-tokyo/') }>
            境町 → 東京
          </a>
          <a className={currentView==='tokyo_to_sakai' ? 'route-link is-active' : 'route-link'} href={withBasePath('/tokyo-to-sakai/') }>
            東京 → 境町
          </a>
        </nav>
        <p className="muted">{note}</p>
      </header>
      <main className="container card">
        <Controls
          direction={direction} setDirection={setDirection}
          tokyoStop={tokyoStop} setTokyoStop={setTokyoStop}
          nowValue={nowValue} setNowValue={setNowValue}
        />
        <TripRows
          direction={direction}
          tokyoStop={tokyoStop}
          trips={trips as any}
          nowValue={nowValue}
          initialNowIso={initialNowIso}
        />
        <section className="quick-links" aria-label="よく使う導線">
          {[
            {
              title: '料金・支払い',
              description: '運賃表と支払い方法を確認',
              href: withBasePath('/guide/#fares')
            },
            {
              title: 'よくある質問',
              description: '初めて利用する方向けのFAQ',
              href: withBasePath('/faq/')
            },
            {
              title: '乗換案内',
              description: '主要駅までの経路を検索',
              href: 'https://transit.yahoo.co.jp/',
              external: true
            },
            {
              title: '運行状況・遅延',
              description: '境町公式ページで最新情報を確認',
              href: 'https://www.town.ibaraki-sakai.lg.jp/page/page002622.html',
              external: true
            }
          ].map((link)=> (
            <a
              key={link.title}
              className="quick-link"
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              onClick={()=>trackEvent('quick_link_click', { title: link.title, external: !!link.external })}
            >
              <span className="quick-link__title">{link.title}</span>
              <span className="quick-link__desc">{link.description}</span>
              <span className="quick-link__icon" aria-hidden="true">→</span>
            </a>
          ))}
        </section>
        <section className="footer-note">
          <p className="muted">
            本アプリの時刻表は <a href="https://www.town.ibaraki-sakai.lg.jp/page/page002622.html" target="_blank" rel="noopener noreferrer">境町公式サイト掲載の時刻表</a>（令和6年4月1日改定）をもとに作成しています。<br />
            最新の情報は必ず公式ページでご確認ください。
          </p>
        </section>
      </main>
      <footer className="container footer">
        <span>© 2025 Amida Design · Sakaimachi Bus Mini</span>
        <nav className="footer-links" aria-label="補足ページ">
          <a className="link" href={withBasePath('/faq/')}>FAQ</a>
          <a className="link" href={withBasePath('/guide/')}>乗車ガイド</a>
          <a className="link" href="https://github.com/ysatodat/Sakaimachi-Tokyo-Bus-App/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer">ご意見・不具合の報告</a>
          <a href="https://amida-des.com/" className="link" target="_blank" rel="noreferrer">Amida Design</a>
          <a href="https://github.com/ysatodat/Sakaimachi-Tokyo-Bus-App" className="link" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </footer>
    </>
  );
}
