/** 構造化データ（JSON-LD）の生成。ページ側の記述量を減らすためにまとめる。 */

import { formatHHmm } from './jst.ts';
import { SITE, buildUrl, PAGES, OFFICIAL_LINKS } from './site.ts';
import type { NormalizedTimetable, RouteId } from './timetable.ts';
import { findRoute } from './timetable.ts';

const organization = {
  '@type': 'Organization',
  name: SITE.publisher.name,
  url: SITE.publisher.url
};

export function webApplicationSchema(description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE.name,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    url: buildUrl(),
    description,
    inLanguage: 'ja',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    publisher: organization,
    author: SITE.author
  };
}

export function breadcrumbSchema(trail: { name: string; slug: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: buildUrl(item.slug)
    }))
  };
}

/** 路線の全便を BusTrip として出力する */
export function routeSchema(timetable: NormalizedTimetable, routeId: RouteId) {
  const route = findRoute(timetable, routeId);
  if (!route) return null;
  const stops = timetable.stops;
  const origin = route.stops[0]!;
  const destination = route.stops[route.stops.length - 1]!;

  return {
    '@context': 'https://schema.org',
    '@type': 'BusTrip',
    name: `境町⇄東京 高速バス ${route.name}`,
    provider: organization,
    departureBusStop: { '@type': 'BusStop', name: stops[origin]?.name ?? origin },
    arrivalBusStop: { '@type': 'BusStop', name: stops[destination]?.name ?? destination },
    subTrip: route.trips.map((trip) => ({
      '@type': 'BusTrip',
      name: `${stops[origin]?.short ?? ''} ${formatHHmm(trip.times.weekday[origin] ?? 0)} 発 → ${
        stops[destination]?.short ?? ''
      } ${formatHHmm(trip.times.weekday[destination] ?? 0)} 着`,
      departureTime: formatHHmm(trip.times.weekday[origin] ?? 0),
      arrivalTime: formatHHmm(trip.times.weekday[destination] ?? 0),
      departureBusStop: { '@type': 'BusStop', name: stops[origin]?.name ?? origin },
      arrivalBusStop: { '@type': 'BusStop', name: stops[destination]?.name ?? destination }
    }))
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

export const OFFICIAL_SAME_AS = [OFFICIAL_LINKS.town, OFFICIAL_LINKS.kantetsu, OFFICIAL_LINKS.jrbus];
export const SITE_PAGES = PAGES;
