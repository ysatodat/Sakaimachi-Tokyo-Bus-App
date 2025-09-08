// 置き換え対象: src/components/TripRows.tsx
import React from 'react';
import { fmtHHmm, minutesUntil, parseHHmm, now as nowFn } from '../lib/time';

type STT =
  | { dep: string, arr_oji: string, arr_tokyo: string } // 既存フォーマット互換
  | { dep: string, arr_oji: { weekday: string, holiday: string }, arr_tokyo: { weekday: string, holiday: string } };

type TTS = { dep_oji: string, dep_tokyo: string, arr_sakai: string };

export default function TripRows({
  direction, tokyoStop, trips, nowValue
}:{
  direction:'sakai_to_tokyo'|'tokyo_to_sakai';
  tokyoStop:'oji'|'tokyo';
  trips:(STT|TTS)[];
  nowValue:string;
}){
  const now = nowValue ? parseHHmm(nowValue) : nowFn();
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
        <div className="badge">{mins}分後</div>
      </div>
    );
  };

  return (
    <div>
      <section className="summary">
        <div className="chip">始発: {first? fmtHHmm(first.dep): '--:--'}</div>
        <div className="chip">終バス: {last? fmtHHmm(last.dep): '--:--'}</div>
        <div className="chip">{isHoliday ? '土日祝ダイヤ' : '平日ダイヤ'}</div>
      </section>
      <section className="results">
        <h2>次発</h2>
        <div className="trip">{Row(next,'次の便')}</div>
        <h2>以降</h2>
        <div id="upcoming">
          {upcoming.length ? upcoming.map((t:any,i:number)=><div className="trip" key={i}>{Row(t)}</div>) : <div className="kicker">以降の便はありません。</div>}
        </div>
      </section>
    </div>
  );
}