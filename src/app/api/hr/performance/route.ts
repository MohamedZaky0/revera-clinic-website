import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyHrAccess } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: reviews, error } = await supabaseServer
      .from('hr_performance_reviews')
      .select('*, employee_accounts!hr_performance_reviews_employee_id_fkey(id, name, email, role_name), reviewer:employee_accounts!hr_performance_reviews_reviewer_id_fkey(id, name)')
      .order('review_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(reviews);
  } catch (err: any) {
    console.error('GET /api/hr/performance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { employeeId, reviewerId, rating, comments, goals } = await req.json();

    if (!employeeId || !reviewerId || rating === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('hr_performance_reviews')
      .insert({
        employee_id: employeeId,
        reviewer_id: reviewerId,
        review_date: new Date().toISOString().split('T')[0],
        rating: Number(rating),
        comments: comments || null,
        goals: goals || null
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/hr/performance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyHrAccess(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('hr_performance_reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/hr/performance error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
