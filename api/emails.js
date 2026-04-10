import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Simple admin check via query param — replace with proper auth if needed
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  if (secret !== process.env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get all emails with timestamps
    const emails = await kv.hgetall('workshop_emails');
    const count = emails ? Object.keys(emails).length : 0;

    // Format as CSV-friendly
    const list = emails
      ? Object.entries(emails)
          .map(([email, timestamp]) => ({ email, registered: timestamp }))
          .sort((a, b) => a.registered.localeCompare(b.registered))
      : [];

    // CSV export if requested
    const format = url.searchParams.get('format');
    if (format === 'csv') {
      const csv = 'email,registered\n' + list.map(r => `${r.email},${r.registered}`).join('\n');
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=workshop-emails.csv'
        }
      });
    }

    return new Response(JSON.stringify({ count, emails: list }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
