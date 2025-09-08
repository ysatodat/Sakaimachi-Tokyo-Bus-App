import React from 'react';
type Props = {
  direction: 'sakai_to_tokyo'|'tokyo_to_sakai';
  setDirection: (v: Props['direction']) => void;
  tokyoStop: 'oji'|'tokyo';
  setTokyoStop: (v: 'oji'|'tokyo') => void;
  nowValue: string;
  setNowValue: (v: string) => void;
};
export default function Controls({direction,setDirection,tokyoStop,setTokyoStop,nowValue,setNowValue}:Props){
  return (
    <section className="controls">
      <div className="control">
        <label htmlFor="direction">方向</label>
        <select id="direction" value={direction} onChange={e=>setDirection(e.target.value as Props['direction'])}>
          <option value="sakai_to_tokyo">境町 → 東京（王子/東京）</option>
          <option value="tokyo_to_sakai">東京（王子/東京） → 境町</option>
        </select>
      </div>
      {direction==='tokyo_to_sakai' && (
        <div className="control">
          <label htmlFor="tokyoStop">東京側の目的地</label>
          <select id="tokyoStop" value={tokyoStop} onChange={e=>setTokyoStop(e.target.value as 'oji'|'tokyo')}>
            <option value="oji">王子駅</option>
            <option value="tokyo">東京駅</option>
          </select>
        </div>
      )}
      <div className="control">
        <label htmlFor="now">現在時刻（調整用）</label>
        <input id="now" type="time" value={nowValue} onChange={e=>setNowValue(e.target.value)} />
        <button className="ghost" onClick={()=>setNowValue('')}>現在時刻に戻す</button>
      </div>
    </section>
  );
}