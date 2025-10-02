// 置き換え対象: src/components/TripRows.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { fmtHHmm, minutesUntil, parseHHmm, now as nowFn, ZONE } from '../lib/time';

type STT =
  | { dep: string, arr_oji: string, arr_tokyo: string } // 既存フォーマット互換
  | { dep: string, arr_oji: { weekday: string, holiday: string }, arr_tokyo: { weekday: string, holiday: string } };

type TTS = { dep_oji: string, dep_tokyo: string, arr_sakai: string };

export default function TripRows({
  direction, tokyoStop, trips, nowValue, initialNowIso
}:{
  direction:'sakai_to_tokyo'|'tokyo_to_sakai';
  tokyoStop:'oji'|'tokyo';
  trips:(STT|TTS)[];
  nowValue:string;
  initialNowIso: string;
}){
  const initialBase = useMemo(() => dayjs(initialNowIso).tz(ZONE), [initialNowIso]);
  const [baseNow, setBaseNow] = useState<Dayjs>(initialBase);
  const [tick, setTick] = useState(0);
  const [showA2hs, setShowA2hs] = useState(false);
  const [heroMessage, setHeroMessage] = useState('');
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTick(0);
    if (nowValue) {
      setBaseNow(parseHHmm(nowValue));
      return;
    }
    setBaseNow(nowFn());
  }, [nowValue]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const showHeroMessage = useCallback((text: string) => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }
    setHeroMessage(text);
    messageTimer.current = setTimeout(() => setHeroMessage(''), 2400);
  }, [setHeroMessage]);

  useEffect(() => () => {
    if (messageTimer.current) {
      clearTimeout(messageTimer.current);
    }
  }, []);

  const now = useMemo(() => {
    if (nowValue) {
      return baseNow.add(tick, 'second');
    }
    return tick === 0 ? baseNow : nowFn();
  }, [baseNow, nowValue, tick]);
  const isHoliday = [0,6].includes(now.day()); // 日=0, 土=6（※祝日カレンダーは別途拡張可）

  // ヘルパー: 文字列 or {weekday,holiday} の時刻を選んでパース
  const pick = (v: string | {weekday:string, holiday:string}) =>
    typeof v === 'string' ? parseHHmm(v) : parseHHmm(isHoliday ? v.holiday : v.weekday);

  const parsed = (direction==='sakai_to_tokyo')
    ? (trips as STT[]).map(t=>{
        // 既存 or 拡張のどちらにも対応
        const arr_oji = (t as any).arr_oji;
        const arr_tokyo = (t as any).arr_tokyo;
        return {
          dep: parseHHmm((t as any).dep),
          arr_oji: pick(arr_oji as any),
          arr_tokyo: pick(arr_tokyo as any)
        };
      })
    : (trips as TTS[]).map(t=>({
        dep: tokyoStop==='oji' ? parseHHmm(t.dep_oji) : parseHHmm(t.dep_tokyo),
        dep_oji: parseHHmm(t.dep_oji),
        dep_tokyo: parseHHmm(t.dep_tokyo),
        arr_sakai: parseHHmm(t.arr_sakai)
      }));

  parsed.sort((a:any,b:any)=>a.dep.valueOf()-b.dep.valueOf());
  const first = parsed[0];
  const last  = parsed[parsed.length-1];
  const next  = parsed.find((t:any)=>t.dep.isAfter(now));
  const upcoming = parsed.filter((t:any)=>t.dep.isAfter(now)).slice(1,5);
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const shareSupported = !!(nav && 'share' in nav);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://sakaimachi-bus.amida-des.com/';
    const shareTitle = '境町 ↔ 東京 高速バス';
    const shareText = (() => {
      if (!next) {
        return '境町と東京を結ぶ高速バスの時刻・次発をチェックしよう。';
      }
      if (direction === 'sakai_to_tokyo') {
        return `次の便は境町 ${fmtHHmm(next.dep)} 発 → 東京 ${fmtHHmm((next as any).arr_tokyo)} 着（王子 ${fmtHHmm((next as any).arr_oji)}）`;
      }
      return `次の便は${tokyoStop==='oji'?'王子':'東京'} ${fmtHHmm(next.dep)} 発 → 境町 ${fmtHHmm((next as any).arr_sakai)} 着`;
    })();

    try {
      if (shareSupported && nav?.share) {
        await nav.share({ title: shareTitle, text: shareText, url: shareUrl });
        showHeroMessage('共有メニューを開きました');
        return;
      }
      if (nav?.clipboard && nav.clipboard.writeText) {
        await nav.clipboard.writeText(shareUrl);
        showHeroMessage('リンクをコピーしました');
        return;
      }
      showHeroMessage(`URL: ${shareUrl}`);
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        showHeroMessage('共有をキャンセルしました');
        return;
      }
      showHeroMessage('共有に失敗しました');
    }
  }, [direction, nav, next, shareSupported, showHeroMessage, tokyoStop]);

  const fmtHMRemain = (minutes:number) => {
    const h = Math.floor(minutes/60);
    const m = Math.max(0, minutes % 60);
    const pad = (n:number)=> n.toString().padStart(2,'0');
    return `${pad(h)}時間${pad(m)}分後`;
  };

  const Row = (t:any, label?:string) => {
    if(!t) return <div className="kicker">本日の運行は終了しました。</div>;
    const mins = minutesUntil(t.dep, now);
    return (
      <div className="tripRow">
        <div>
          {label && <div className="kicker">{label}</div>}
          {direction==='sakai_to_tokyo' ? (
            <div><span className="time">境町 {fmtHHmm(t.dep)}</span> 発 → <span className="time">王子 {fmtHHmm(t.arr_oji)}</span>／<span className="time">東京 {fmtHHmm(t.arr_tokyo)}</span></div>
          ) : (
            <div><span className="time">{tokyoStop==='oji'?'王子':'東京'} {fmtHHmm(t.dep)}</span> 発 → <span className="time">境町 {fmtHHmm(t.arr_sakai)}</span></div>
          )}
        </div>
        <div className="badge badge--relative">{fmtHMRemain(mins)}</div>
      </div>
    );
  };

  return (
    <div>
      <section className="summary">
        <div className="chip"><span>始発</span><strong>{first? fmtHHmm(first.dep): '--:--'}</strong></div>
        <div className="chip"><span>終バス</span><strong>{last? fmtHHmm(last.dep): '--:--'}</strong></div>
        <div className="chip"><span>運行</span><strong>{isHoliday ? '土日祝ダイヤ' : '平日ダイヤ'}</strong></div>
      </section>
      <section className="results">
        <h2 className="sr-only">次発</h2>
        {/* ヒーローカード（アクティブ・カセット） */}
        <div className="hero">
          {!next ? (
            <div className="kicker">本日の運行は終了しました。</div>
          ) : (
            <>
              <div className="hero-time">{fmtHHmm(next.dep)}</div>
              <div className="countdown" aria-live="polite">
                {(()=>{
                  const diffSec = Math.max(0, next.dep.diff(now, 'second'));
                  const h = Math.floor(diffSec/3600);
                  const m = Math.floor((diffSec%3600)/60);
                  const s = diffSec%60;
                  const pad = (n:number)=> n.toString().padStart(2,'0');
                  return `出発まで ${pad(h)}:${pad(m)}:${pad(s)}`;
                })()}
              </div>
              <div className="hero-sub">
                {direction==='sakai_to_tokyo'
                  ? <>境町 発 → 王子 {fmtHHmm((next as any).arr_oji)} ／ 東京 {fmtHHmm((next as any).arr_tokyo)}</>
                  : <>{tokyoStop==='oji'?'王子':'東京'} 発 → 境町 {fmtHHmm((next as any).arr_sakai)}</>}
              </div>
            </>
          )}
          <div className="hero-actions" aria-label="クイックアクション">
            <button type="button" className="hero-action" onClick={handleShare}>
              <span aria-hidden="true">↗</span>
              <span>{shareSupported ? '共有する' : 'リンクをコピー'}</span>
            </button>
            <button
              type="button"
              className={showA2hs ? 'hero-action is-active' : 'hero-action'}
              onClick={()=>setShowA2hs((v)=>!v)}
              aria-expanded={showA2hs}
              aria-pressed={showA2hs}
            >
              <span aria-hidden="true">★</span>
              <span>ホーム画面に追加</span>
            </button>
          </div>
          {heroMessage && (
            <div className="hero-feedback" role="status">{heroMessage}</div>
          )}
          {showA2hs && (
            <div className="hero-helper" role="note">
              <p>iOS: Safariの共有ボタンから「ホーム画面に追加」を選択してください。</p>
              <p>Android: Chromeのメニュー → 「ホーム画面に追加」で素早く開けます。</p>
            </div>
          )}
        </div>
        <h2>以降</h2>
        <div id="upcoming">
          {upcoming.length ? upcoming.map((t:any,i:number)=><div className="trip" key={i}>{Row(t)}</div>) : <div className="kicker">以降の便はありません。</div>}
        </div>
      </section>
    </div>
  );
}
