import React from 'react';
import { trackEvent } from '../lib/analytics';
type Props = {
  direction: 'sakai_to_tokyo'|'tokyo_to_sakai';
  setDirection: (v: Props['direction']) => void;
  tokyoStop: 'oji'|'tokyo';
  setTokyoStop: (v: 'oji'|'tokyo') => void;
  nowValue: string;
  setNowValue: (v: string) => void;
};
export default function Controls({direction,setDirection,tokyoStop,setTokyoStop,nowValue,setNowValue}:Props){
  const handleDirectionKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setDirection('tokyo_to_sakai');
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setDirection('sakai_to_tokyo');
    }
  };

  return (
    <section className="controls">
      <div className="control">
        <p className="control-label" id="direction-label">方向</p>
        <div className="segmented" role="radiogroup" aria-labelledby="direction-label" onKeyDown={handleDirectionKey}>
          <button
            type="button"
            className={direction==='sakai_to_tokyo' ? 'segmented__option is-active' : 'segmented__option'}
            role="radio"
            aria-checked={direction==='sakai_to_tokyo'}
            onClick={()=>{
              setDirection('sakai_to_tokyo');
              trackEvent('direction_change', { direction: 'sakai_to_tokyo' });
            }}
          >
            <span className="segmented__eyebrow">境町 発</span>
            <span className="segmented__label">境町 → 東京</span>
          </button>
          <button
            type="button"
            className={direction==='tokyo_to_sakai' ? 'segmented__option is-active' : 'segmented__option'}
            role="radio"
            aria-checked={direction==='tokyo_to_sakai'}
            onClick={()=>{
              setDirection('tokyo_to_sakai');
              trackEvent('direction_change', { direction: 'tokyo_to_sakai' });
            }}
          >
            <span className="segmented__eyebrow">東京 発</span>
            <span className="segmented__label">東京 → 境町</span>
          </button>
        </div>
      </div>
      {direction==='tokyo_to_sakai' && (
        <div className="control">
          <label htmlFor="tokyoStop">東京側の目的地</label>
          <select id="tokyoStop" value={tokyoStop} onChange={e=>{
            const value = e.target.value as 'oji'|'tokyo';
            setTokyoStop(value);
            trackEvent('tokyo_stop_change', { stop: value });
          }}>
            <option value="oji">王子駅</option>
            <option value="tokyo">東京駅</option>
          </select>
        </div>
      )}
      <div className="control">
        <label htmlFor="now">現在時刻（調整用）</label>
        <input id="now" type="time" value={nowValue} onChange={e=>{
          setNowValue(e.target.value);
          trackEvent('manual_time_set');
        }} />
        <button className="ghost" onClick={()=>{
          setNowValue('');
          trackEvent('manual_time_reset');
        }}>現在時刻に戻す</button>
      </div>
    </section>
  );
}
