'use client';
import { useMemo, useState } from 'react';
import Controls from './Controls';
import TripRows from './TripRows';
import data from '../data/timetable.sample.json';

type AppProps = { initialNowIso: string };

export default function App({ initialNowIso }: AppProps){
  const [direction,setDirection] = useState<'sakai_to_tokyo'|'tokyo_to_sakai'>('sakai_to_tokyo');
  const [tokyoStop,setTokyoStop] = useState<'oji'|'tokyo'>('oji');
  const [nowValue,setNowValue]   = useState<string>('');

  const routes = (data as any).routes as any[];
  const trips  = useMemo(()=> direction==='sakai_to_tokyo'
    ? (routes.find(r=>r.id==='sakai_to_tokyo')?.trips ?? [])
    : (routes.find(r=>r.id==='tokyo_to_sakai')?.trips ?? [])
  ,[direction]);

  const note = (data as any).calendar?.note ?? '';

  return (
    <>
      <header className="container">
        <h1>境町 ↔ 東京 高速バス</h1>
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
        <section className="footer-note">
          <p className="muted">
            本アプリの時刻表は <a href="https://www.town.ibaraki-sakai.lg.jp/page/page002622.html" target="_blank" rel="noopener noreferrer">境町公式サイト掲載の時刻表</a>（令和6年4月1日改定）をもとに作成しています。<br />
            最新の情報は必ず公式ページでご確認ください。
          </p>
        </section>
      </main>
      <footer className="container footer">
        <span>© 2025 Amida Design · Sakaimachi Bus Mini</span>
        <a href="https://amida-des.com/" className="link" target="_blank" rel="noreferrer">Amida Design</a>
        <a href="https://github.com/ysatodat/Sakaimachi-Tokyo-Bus-App" className="link" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </>
  );
}
