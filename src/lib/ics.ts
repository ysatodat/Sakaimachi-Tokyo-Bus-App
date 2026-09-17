/**
 * 便を iCalendar（.ics）にして端末のカレンダーへ渡す。
 * 外部サービスを経由せず、Blob として生成するのでオフラインでも動作する。
 */

import { jstToDate, type JstDate } from './jst.ts';

const pad = (n: number) => n.toString().padStart(2, '0');

const toUtcStamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** RFC 5545 のエスケープ */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** 75 オクテットで折り返す（実務上は文字数で十分な近似） */
const fold = (line: string) => {
  if (line.length <= 73) return line;
  const chunks: string[] = [line.slice(0, 73)];
  let rest = line.slice(73);
  while (rest.length > 72) {
    chunks.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  if (rest) chunks.push(` ${rest}`);
  return chunks.join('\r\n');
};

export type IcsEvent = {
  uid: string;
  title: string;
  description: string;
  location: string;
  date: JstDate;
  startMinutes: number;
  endMinutes: number;
  /** 何分前にアラームを鳴らすか。0 以下なら設定しない */
  alarmMinutesBefore?: number;
  url?: string;
};

export function buildIcs(event: IcsEvent): string {
  const start = jstToDate(event.date, event.startMinutes);
  const end = jstToDate(event.date, event.endMinutes);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sakaimachi Bus Mini//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`
  ];
  if (event.url) lines.push(`URL:${escapeText(event.url)}`);
  if (event.alarmMinutesBefore && event.alarmMinutesBefore > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(event.title)}`,
      `TRIGGER:-PT${Math.round(event.alarmMinutesBefore)}M`,
      'END:VALARM'
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n');
}

/** .ics をダウンロードさせる（ブラウザ専用） */
export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
