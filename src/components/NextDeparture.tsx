import { memo } from 'react';
import { boardingStatus, type DepartureWithCountdown } from '../lib/schedule.ts';
import { formatCountdown, formatDuration, formatRelative } from '../lib/format.ts';
import { formatDateLabel, formatHHmm, type JstDate } from '../lib/jst.ts';
import { diffDays } from '../lib/jst.ts';
import type { StopId, StopInfo } from '../lib/timetable.ts';

const STATUS_LABEL: Record<string, string> = {
  hurry: '急いでください',
  tight: 'そろそろ出発',
  comfortable: '間に合います',
  later: '時間に余裕あり',
  departed: '発車済み'
};

type Props = {
  departure: DepartureWithCountdown | null;
  /** ヒーローの直後に並べる後続便 */
  followUps?: DepartureWithCountdown[];
  stops: Record<StopId, StopInfo>;
  walkMinutes: number;
  today: JstDate;
  loading: boolean;
  onShare: () => void;
  onCalendar: () => void;
};

/** 相対日付のラベル（今日/明日/9月20日(日)） */
function dayPrefix(today: JstDate, target: JstDate): string {
  const offset = diffDays(today, target);
  if (offset === 0) return '今日';
  if (offset === 1) return '明日';
  if (offset === 2) return '明後日';
  return formatDateLabel(target);
}

function Legs({ departure, stops }: { departure: DepartureWithCountdown; stops: Record<StopId, StopInfo> }) {
  const boardIndex = departure.stopTimes.findIndex((stop) => stop.stop === departure.boardStop);
  return (
    <div className="hero__route">
      {departure.stopTimes.map((stopTime, index) => {
        if (index < boardIndex) return null;
        const info = stops[stopTime.stop];
        const role = index === boardIndex ? '乗車' : stopTime.stop === departure.alightStop ? '降車' : '経由';
        return (
          <div className="leg" key={stopTime.stop}>
            <span className="leg__time tnum">{formatHHmm(stopTime.minutes)}</span>
            <span className="leg__stop">
              <span className="leg__name">{info?.name ?? stopTime.stop}</span>
              {index === boardIndex && info?.platform && info.platform !== info.name && (
                <span className="leg__platform">{info.platform}</span>
              )}
            </span>
            <span className="leg__role">{role}</span>
          </div>
        );
      })}
    </div>
  );
}

function NextDeparture({
  departure,
  followUps = [],
  stops,
  walkMinutes,
  today,
  loading,
  onShare,
  onCalendar
}: Props) {
  if (loading) {
    // 読み込み中も本番と同じ構造・同じ高さで描画し、レイアウトシフトを起こさない
    return (
      <section className="hero" aria-busy="true" aria-label="次の便を計算しています">
        <div className="hero__top">
          <span className="hero__eyebrow">次に出発する便</span>
          <span className="status-badge status-badge--later">読み込み中</span>
        </div>
        <div className="hero__headline">
          <span className="hero__time tnum skeleton" aria-hidden="true">
            &nbsp;--:--&nbsp;
          </span>
          <span className="hero__relative">
            <span className="hero__relative-main skeleton" aria-hidden="true">
              &nbsp;
            </span>
            <span className="hero__relative-sub" aria-hidden="true">
              &nbsp;
            </span>
          </span>
        </div>
        <div className="hero__route">
          {[0, 1, 2].map((index) => (
            <div className="leg" key={index}>
              <span className="leg__time tnum skeleton">&nbsp;--:--&nbsp;</span>
              <span className="leg__stop">
                <span className="leg__name">&nbsp;</span>
              </span>
              <span className="leg__role">&nbsp;</span>
            </div>
          ))}
        </div>
        <div className="hero__meta">
          <span>&nbsp;</span>
        </div>
        <dl className="hero__next-up">
          <dt>このあと</dt>
          <dd>
            <span className="tnum skeleton">&nbsp;--:--&nbsp;</span>
            <span className="tnum skeleton">&nbsp;--:--&nbsp;</span>
            <span className="tnum skeleton">&nbsp;--:--&nbsp;</span>
          </dd>
        </dl>
        <div className="hero__actions">
          <span className="button skeleton" aria-hidden="true">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          <span className="button skeleton" aria-hidden="true">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </section>
    );
  }

  if (!departure) {
    return (
      <section className="hero hero--empty">
        <div className="hero__top">
          <span className="hero__eyebrow">次に出発する便</span>
        </div>
        <p className="muted">
          この方向の運行データが見つかりませんでした。時刻表ページから全便をご確認ください。
        </p>
      </section>
    );
  }

  const status = boardingStatus(departure.secondsUntil, walkMinutes);
  const prefix = dayPrefix(today, departure.date);
  const alight = stops[departure.alightStop];
  const board = stops[departure.boardStop];
  const summary = `${prefix} ${formatHHmm(departure.departureMinutes)} ${board?.name ?? ''}発、${
    alight?.name ?? ''
  } ${formatHHmm(departure.arrivalMinutes)}着。${formatRelative(departure.secondsUntil)}出発。`;

  return (
    <section className="hero" aria-label="次に出発する便">
      <p className="sr-only">{summary}</p>
      <div className="hero__top">
        <span className="hero__eyebrow">
          次に出発する便{prefix !== '今日' ? ` · ${prefix}` : ''}
        </span>
        <span className={`status-badge status-badge--${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="hero__headline">
        <span className="hero__time tnum" aria-hidden="true">
          {formatHHmm(departure.departureMinutes)}
        </span>
        <span className="hero__relative">
          <span className="hero__relative-main" aria-hidden="true">
            {formatRelative(departure.secondsUntil)}
          </span>
          <span className="hero__relative-sub" aria-hidden="true">
            残り {formatCountdown(departure.secondsUntil)}
          </span>
        </span>
      </div>

      <Legs departure={departure} stops={stops} />

      <div className="hero__meta">
        <span>
          所要 <strong>{formatDuration(departure.durationMinutes)}</strong>
        </span>
        <span>
          ダイヤ <strong>{departure.dayType === 'holiday' ? '土日祝' : '平日'}</strong>
          {departure.holiday ? `（${departure.holiday}）` : ''}
        </span>
        <span>
          徒歩 <strong>{walkMinutes}分</strong> で計算
        </span>
      </div>

      {followUps.length > 0 && (
        <dl className="hero__next-up">
          <dt>このあと</dt>
          <dd>
            {followUps.map((item) => (
              <span key={`${item.date.day}-${item.tripId}`} className="tnum">
                {formatHHmm(item.departureMinutes)}
              </span>
            ))}
          </dd>
        </dl>
      )}

      <div className="hero__actions">
        <button type="button" className="button button--primary" onClick={onCalendar}>
          <span aria-hidden="true">🗓</span>
          <span>カレンダーに追加</span>
        </button>
        <button type="button" className="button" onClick={onShare}>
          <span aria-hidden="true">↗</span>
          <span>この便を共有</span>
        </button>
        {board?.mapUrl && (
          <a className="button" href={board.mapUrl} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true">📍</span>
            <span>のりばを地図で見る</span>
          </a>
        )}
      </div>
    </section>
  );
}

export default memo(NextDeparture);
