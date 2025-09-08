import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import cpf from 'dayjs/plugin/customParseFormat';
dayjs.extend(utc); dayjs.extend(tz); dayjs.extend(cpf);

export const ZONE = 'Asia/Tokyo';
export const now = () => dayjs().tz(ZONE);
export const parseHHmm = (s: string) => dayjs.tz(s, 'HH:mm', ZONE);
export const fmtHHmm = (d: dayjs.Dayjs) => d.format('HH:mm');
export const minutesUntil = (to: dayjs.Dayjs, base = now()) => to.diff(base, 'minute');