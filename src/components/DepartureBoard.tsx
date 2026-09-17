import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NextDeparture from './NextDeparture.tsx';
import DepartureList from './DepartureList.tsx';
import { trackEvent } from '../lib/analytics.ts';
import { buildIcs, downloadIcs } from '../lib/ics.ts';
import {
  addDays,
  diffDays,
  formatDateLabel,
  formatHHmm,
  fromIsoDate,
  nowJst,
  toIsoDate,
  type JstDate,
  type JstMoment
} from '../lib/jst.ts';
import {
  dayInfo,
  referenceFrom,
  serviceSpan,
  timetableForDate,
  upcomingDepartures,
  type DepartureWithCountdown
} from '../lib/schedule.ts';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, type Preferences } from '../lib/prefs.ts';
import { findRoute, type NormalizedTimetable, type RouteId, type StopId } from '../lib/timetable.ts';

type Props = {
  timetable: NormalizedTimetable;
  initialDirection?: RouteId;
  initialBoardStop?: StopId;
  /** ルート専用ページでは方向切替を隠す */
  lockDirection?: boolean;
  timetableHref: string;
  guideHref: string;
};

const UPCOMING_LIMIT = 5;

export default function DepartureBoard({
  timetable,
  initialDirection = 'sakai_to_tokyo',
  initialBoardStop,
  lockDirection = false,
  timetableHref,
  guideHref
}: Props) {
  const [now, setNow] = useState<JstMoment | null>(null);
  const [direction, setDirection] = useState<RouteId>(initialDirection);
  const [preferredStop, setPreferredStop] = useState<StopId>(initialBoardStop ?? 'tokyo');
  const [walkMinutes, setWalkMinutes] = useState(DEFAULT_PREFERENCES.walkMinutes);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(true);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  /* --- 起動時: 保存済み設定と URL パラメータを読み込む ------------------- */
  useEffect(() => {
    const stored = loadPreferences();
    const params = new URLSearchParams(window.location.search);
    const urlDirection = params.get('dir');
    const urlStop = params.get('from');

    if (!lockDirection) {
      if (urlDirection === 'sakai_to_tokyo' || urlDirection === 'tokyo_to_sakai') {
        setDirection(urlDirection);
      } else if (stored.direction) {
        setDirection(stored.direction);
      }
    }
    if (urlStop === 'tokyo' || urlStop === 'oji' || urlStop === 'sakai') {
      setPreferredStop(urlStop);
    } else if (stored.boardStop) {
      setPreferredStop(stored.boardStop);
    }
    if (typeof stored.walkMinutes === 'number') setWalkMinutes(stored.walkMinutes);

    const urlDate = params.get('date');
    if (urlDate && fromIsoDate(urlDate)) setSelectedDateIso(urlDate);

    setNow(nowJst());
    hydrated.current = true;
  }, [lockDirection]);

  /* --- 毎秒の時計。タブが非表示のあいだは止めて電池を使わない ----------- */
  useEffect(() => {
    if (!hydrated.current && now === null) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      setNow(nowJst());
      timer = setInterval(() => setNow(nowJst()), 1000);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [now === null]);

  /* --- 設定の保存と URL 同期 -------------------------------------------- */
  useEffect(() => {
    if (!hydrated.current) return;
    const preferences: Preferences = {
      ...DEFAULT_PREFERENCES,
      ...loadPreferences(),
      direction,
      boardStop: preferredStop,
      walkMinutes
    };
    savePreferences(preferences);

    const params = new URLSearchParams(window.location.search);
    if (lockDirection) params.delete('dir');
    else params.set('dir', direction);
    params.set('from', preferredStop);
    if (selectedDateIso) params.set('date', selectedDateIso);
    else params.delete('date');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [direction, preferredStop, walkMinutes, selectedDateIso, lockDirection]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  /* --- 派生値 ------------------------------------------------------------ */
  const route = useMemo(() => findRoute(timetable, direction), [timetable, direction]);
  const boardStop: StopId = useMemo(() => {
    if (!route) return 'sakai';
    return route.boardingStops.includes(preferredStop) ? preferredStop : route.boardingStops[0]!;
  }, [route, preferredStop]);

  const today: JstDate | null = now
    ? { year: now.year, month: now.month, day: now.day, weekday: now.weekday }
    : null;
  const reference = useMemo(() => (now ? referenceFrom(now) : null), [now]);

  const upcoming = useMemo(
    () =>
      reference
        ? upcomingDepartures(timetable, direction, boardStop, reference, { limit: UPCOMING_LIMIT + 1 })
        : [],
    [timetable, direction, boardStop, reference]
  );
  const nextDeparture = upcoming[0] ?? null;

  const selectedDate: JstDate | null = useMemo(() => {
    if (selectedDateIso) return fromIsoDate(selectedDateIso);
    return today;
  }, [selectedDateIso, today]);

  const selectedInfo = useMemo(() => (selectedDate ? dayInfo(selectedDate) : null), [selectedDate]);
  const isToday = Boolean(today && selectedDate && diffDays(today, selectedDate) === 0);

  const dayList = useMemo(
    () =>
      selectedDate
        ? timetableForDate(timetable, direction, boardStop, selectedDate, isToday ? reference : null)
        : [],
    [timetable, direction, boardStop, selectedDate, isToday, reference]
  );

  const span = useMemo(
    () => (selectedDate ? serviceSpan(timetable, direction, boardStop, selectedDate) : null),
    [timetable, direction, boardStop, selectedDate]
  );

  /* --- アクション -------------------------------------------------------- */
  const shareText = useCallback(
    (departure: DepartureWithCountdown) => {
      const board = timetable.stops[departure.boardStop];
      const alight = timetable.stops[departure.alightStop];
      return `${formatDateLabel(departure.date)} ${board?.name ?? ''} ${formatHHmm(
        departure.departureMinutes
      )}発 → ${alight?.name ?? ''} ${formatHHmm(departure.arrivalMinutes)}着（境町⇄東京 高速バス）`;
    },
    [timetable.stops]
  );

  const handleShare = useCallback(async () => {
    if (!nextDeparture) return;
    const url = window.location.href;
    const text = shareText(nextDeparture);
    try {
      if (navigator.share) {
        await navigator.share({ title: '境町 ↔ 東京 高速バス', text, url });
        trackEvent('share_invoke', { method: 'web_share', direction });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        showToast('便の情報をコピーしました');
        trackEvent('share_invoke', { method: 'clipboard', direction });
        return;
      }
      showToast(url);
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      showToast('共有できませんでした');
      trackEvent('share_error', { direction });
    }
  }, [direction, nextDeparture, shareText, showToast]);

  const handleCalendar = useCallback(
    (departure: DepartureWithCountdown | null) => {
      if (!departure) return;
      const board = timetable.stops[departure.boardStop];
      const alight = timetable.stops[departure.alightStop];
      const ics = buildIcs({
        uid: `${departure.tripId}-${toIsoDate(departure.date)}@sakaimachi-bus`,
        title: `高速バス ${board?.short ?? ''} → ${alight?.short ?? ''}`,
        description: `${board?.name ?? ''} ${formatHHmm(departure.departureMinutes)} 発 / ${
          alight?.name ?? ''
        } ${formatHHmm(departure.arrivalMinutes)} 着\n${
          departure.dayType === 'holiday' ? '土日祝ダイヤ' : '平日ダイヤ'
        }\n時刻は変更される場合があります。公式サイトで最新情報をご確認ください。`,
        location: board?.platform ?? board?.name ?? '',
        date: departure.date,
        startMinutes: departure.departureMinutes,
        endMinutes: departure.arrivalMinutes,
        alarmMinutesBefore: walkMinutes + 5,
        url: window.location.href
      });
      downloadIcs(`sakaimachi-bus-${toIsoDate(departure.date)}-${formatHHmm(departure.departureMinutes).replace(':', '')}.ics`, ics);
      showToast('カレンダー用ファイルを書き出しました');
      trackEvent('calendar_export', { direction });
    },
    [direction, showToast, timetable.stops, walkMinutes]
  );

  const changeDirection = useCallback((value: RouteId) => {
    setDirection(value);
    trackEvent('direction_change', { direction: value });
  }, []);

  /* --- 描画 -------------------------------------------------------------- */
  const stops = timetable.stops;
  const visibleDayList = useMemo(
    () => (isToday && !showPast ? dayList.filter((item) => item.secondsUntil >= 0) : dayList),
    [dayList, isToday, showPast]
  );
  const pastCount = useMemo(
    () => (isToday ? dayList.filter((item) => item.secondsUntil < 0).length : 0),
    [dayList, isToday]
  );

  const dateChips: { label: string; value: string | null }[] = today
    ? [
        { label: '今日', value: null },
        { label: '明日', value: toIsoDate(addDays(today, 1)) },
        { label: '明後日', value: toIsoDate(addDays(today, 2)) }
      ]
    : [{ label: '今日', value: null }];

  const spanHint = span?.first && span?.last
    ? `始発 ${formatHHmm(span.first.departureMinutes)} ／ 終バス ${formatHHmm(span.last.departureMinutes)}`
    : '';

  return (
    <>
      <div className="board-split">
        <div className="stack">
          <section className="card" aria-label="検索条件">
            <div className="controls">
              {!lockDirection && (
                <div className="control control--wide">
                  <span className="control__label" id="direction-label">
                    方向
                  </span>
                  <div className="segmented" role="radiogroup" aria-labelledby="direction-label">
                    {(['sakai_to_tokyo', 'tokyo_to_sakai'] as RouteId[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={direction === value}
                        className={direction === value ? 'segmented__option is-active' : 'segmented__option'}
                        onClick={() => changeDirection(value)}
                      >
                        <span className="segmented__eyebrow">
                          {value === 'sakai_to_tokyo' ? '境町 発' : '東京・王子 発'}
                        </span>
                        <span className="segmented__label">
                          {value === 'sakai_to_tokyo' ? '境町 → 東京' : '東京 → 境町'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {route && route.boardingStops.length > 1 && (
                <div className="control">
                  <span className="control__label" id="board-label">
                    どこから乗りますか
                  </span>
                  <div className="chip-row" role="radiogroup" aria-labelledby="board-label">
                    {route.boardingStops.map((stopId) => (
                      <button
                        key={stopId}
                        type="button"
                        role="radio"
                        aria-checked={boardStop === stopId}
                        className={boardStop === stopId ? 'chip-toggle is-active' : 'chip-toggle'}
                        onClick={() => {
                          setPreferredStop(stopId);
                          trackEvent('board_stop_change', { stop: stopId });
                        }}
                      >
                        {stops[stopId]?.name ?? stopId}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="control">
                <label className="control__label" htmlFor="walk-minutes">
                  バス停まで徒歩何分？
                </label>
                <div className="field-inline">
                  <input
                    id="walk-minutes"
                    type="number"
                    min={0}
                    max={60}
                    step={1}
                    inputMode="numeric"
                    value={walkMinutes}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (Number.isFinite(value)) setWalkMinutes(Math.min(60, Math.max(0, Math.round(value))));
                    }}
                  />
                  <span className="muted" style={{ fontSize: 13 }}>
                    分 — 間に合うかの判定に使います
                  </span>
                </div>
              </div>
            </div>
          </section>

          <NextDeparture
            departure={nextDeparture}
            followUps={upcoming.slice(1, 4)}
            stops={stops}
            walkMinutes={walkMinutes}
            today={today ?? { year: 2000, month: 1, day: 1, weekday: 0 }}
            loading={now === null}
            onShare={handleShare}
            onCalendar={() => handleCalendar(nextDeparture)}
          />
        </div>

        <section className="card" aria-labelledby="dayplan-heading">
          <div className="section-head">
            <h2 className="section-title" id="dayplan-heading">
              {selectedDate ? `${formatDateLabel(selectedDate)} の運行` : '運行一覧'}
              <span className="section-title__hint">
                {selectedInfo
                  ? `${selectedInfo.dayType === 'holiday' ? '土日祝ダイヤ' : '平日ダイヤ'}${
                      selectedInfo.holiday ? `・${selectedInfo.holiday}` : ''
                    }`
                  : ''}
              </span>
            </h2>
            <div className="chip-row" role="group" aria-label="表示する日">
              {dateChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className={
                    (chip.value ?? null) === selectedDateIso ? 'chip-toggle is-active' : 'chip-toggle'
                  }
                  onClick={() => {
                    setSelectedDateIso(chip.value);
                    trackEvent('date_change', { value: chip.value ?? 'today' });
                  }}
                >
                  {chip.label}
                </button>
              ))}
              <input
                type="date"
                aria-label="日付を指定"
                value={selectedDate ? toIsoDate(selectedDate) : ''}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value || !fromIsoDate(value)) return;
                  setSelectedDateIso(today && value === toIsoDate(today) ? null : value);
                  trackEvent('date_change', { value: 'custom' });
                }}
              />
            </div>
            {spanHint && (
              <p className="muted" style={{ fontSize: 12 }}>
                {stops[boardStop]?.name ?? ''} 発・全{span?.count ?? 0}便／{spanHint}
              </p>
            )}
          </div>

          {now === null ? (
            <DepartureList
              departures={[]}
              stops={stops}
              showRelative
              emptyMessage=""
              skeletonRows={route?.trips.length ?? 8}
            />
          ) : (
            <DepartureList
              departures={visibleDayList}
              stops={stops}
              showRelative={isToday}
              highlightTripId={isToday && nextDeparture ? nextDeparture.tripId : null}
              emptyMessage={
                isToday
                  ? 'この日の運行はすべて終了しました。「明日」を選ぶと翌日のダイヤを確認できます。'
                  : 'この日の運行データがありません。'
              }
              onSelect={handleCalendar}
            />
          )}

          <div className="section-foot">
            {isToday && pastCount > 0 && (
              <button
                type="button"
                className="button button--small button--quiet"
                onClick={() => setShowPast((value) => !value)}
                aria-pressed={!showPast}
              >
                {showPast ? `発車済みの${pastCount}便を隠す` : `発車済みの${pastCount}便も表示`}
              </button>
            )}
            <p style={{ marginTop: 4 }}>便を選ぶとカレンダー用ファイル（.ics）を書き出せます。</p>
          </div>
        </section>
      </div>

      <div className="info-grid">
        <a className="info-card" href={timetableHref}>
          <span className="info-card__title">
            全便の時刻表 <span aria-hidden="true">→</span>
          </span>
          <span className="info-card__desc">平日ダイヤと土日祝ダイヤを並べて確認できます。</span>
        </a>
        <a className="info-card" href={guideHref}>
          <span className="info-card__title">
            のりば・運賃・乗車の流れ <span aria-hidden="true">→</span>
          </span>
          <span className="info-card__desc">初めて乗る方向けに、のりばと当日の流れをまとめています。</span>
        </a>
        {timetable.meta.sources.map((source, index) => (
          <a
            key={source.url}
            className="info-card"
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('official_link_click', { label: source.label })}
          >
            <span className="info-card__title">
              {source.label} <span aria-hidden="true">↗</span>
            </span>
            <span className="info-card__desc">
              {index === 0
                ? '運行状況・お知らせ・最新のダイヤはこちら。'
                : '運行事業者による時刻・運賃の一次情報です。'}
            </span>
            <span className="info-card__external">公式サイト（外部リンク）</span>
          </a>
        ))}
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
