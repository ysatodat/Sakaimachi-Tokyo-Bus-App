import { buildUrl } from '../lib/site';

export const prerender = true;

const robots = `User-agent: *
Allow: /

Sitemap: ${buildUrl('sitemap.xml')}
`;

export function GET() {
  return new Response(robots, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
