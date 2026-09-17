import { memo } from 'react';
import type { DepartureWithCountdown } from '../lib/schedule.ts';
import { formatDuration, formatRelative } from '../lib/format.ts';
import { formatHHmm } from '../lib/jst.ts';
import type { StopId, StopInfo } from '../lib/timetable.ts';

type Props = {
  departures: DepartureWithCountdown[];
  stops: Record<StopId, StopInfo>;
  /** 相対時間を出すかどうか（別日を表示しているときは出さない） */
  showRelative: boolean;
  /** 次発として強調する便 */
  highlightTripId?: string | null;
  emptyMessage: string;
  onSelect?: (departure: DepartureWithCountdown) => void;
  /** 読み込み中に確保する行数。0 なら通常描画 */
  skeletonRows?: number;
};

/** 乗車停留所より後の停車地だけを「経由 → 到着」の順に並べる */
function routeSummary(departure: DepartureWithCountdown, stops: Record<StopId, StopInfo>) {
  const boardIndex = departure.stopTimes.findIndex((stop) => stop.stop === departure.boardStop);
  return departure.stopTimes
    .slice(boardIndex + 1)
    .map((stop) => `${stops[stop.stop]?.short ?? stop.stop} ${formatHHmm(stop.minutes)}`)
    .join(' → ');
}

function DepartureList({
  departures,
  stops,
  showRelative,
  highlightTripId,
  emptyMessage,
  onSelect,
  skeletonRows = 0
}: Props) {
  if (skeletonRows > 0) {
    // ハイドレーション前でも本番と同じ行数・行高を確保する
    return (
      <ul className="departure-list" aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <li key={index}>
            <div className="departure">
              <span className="departure__time tnum skeleton">&nbsp;--:--&nbsp;</span>
              <span className="departure__detail">
                <span className="departure__arrival">&nbsp;</span>
              </span>
              <span className="departure__relative">&nbsp;</span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (departures.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className="departure-list">
      {departures.map((departure) => {
        const isPast = showRelative && departure.secondsUntil < 0;
        const isNext = highlightTripId != null && departure.tripId === highlightTripId;
        const content = (
          <>
            <span className="departure__time tnum">{formatHHmm(departure.departureMinutes)}</span>
            <span className="departure__detail">
              <span className="departure__arrival">
                {routeSummary(departure, stops)}
                <span className="muted"> ・ {formatDuration(departure.durationMinutes)}</span>
              </span>
              {isNext && <span className="departure__tag">次に出発する便</span>}
            </span>
            {showRelative && (
              <span className="departure__relative tnum">{formatRelative(departure.secondsUntil)}</span>
            )}
          </>
        );

        const className = ['departure', isNext ? 'is-next' : '', isPast ? 'is-past' : '']
          .filter(Boolean)
          .join(' ');

        return (
          <li key={`${departure.date.month}-${departure.date.day}-${departure.tripId}`}>
            {onSelect ? (
              <button type="button" className={className} onClick={() => onSelect(departure)}>
                {content}
                <span className="sr-only">発。この便をカレンダーに追加します</span>
              </button>
            ) : (
              <div className={className}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default memo(DepartureList);
