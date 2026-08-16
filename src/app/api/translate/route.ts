import { NextResponse } from 'next/server';
import { requireStaffAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const access = await requireStaffAccess(req);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await req.json();
    const text = body.text;
    const from = body.from || body.sl || 'auto';
    const to = body.to || body.tl || 'ar';

    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Translate API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data[0]) {
      throw new Error('Invalid response format from translation service');
    }

    const translation = data[0].map((x: any) => x[0]).join('');

    return NextResponse.json({
      translation,
      translatedText: translation
    });
  } catch (err: any) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 });
  }
}
