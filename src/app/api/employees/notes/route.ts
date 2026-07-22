import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const employeeId = url.searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId is required.' }, { status: 400 });
  }

  try {
    // Attempt join query first
    const { data: notes, error } = await supabaseServer
      .from('employee_notes')
      .select('*, creator:employee_accounts!created_by(id, name)')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Join query failed, falling back to simple query:", error.message);
      
      const { data: simpleNotes, error: simpleError } = await supabaseServer
        .from('employee_notes')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (simpleError) throw simpleError;

      // Enrich creator names in memory
      const creatorIds = Array.from(new Set((simpleNotes || []).map((n: any) => n.created_by).filter(Boolean)));
      if (creatorIds.length > 0) {
        const { data: creators } = await supabaseServer
          .from('employee_accounts')
          .select('id, name')
          .in('id', creatorIds);

        const creatorMap = new Map((creators || []).map((c: any) => [c.id, c.name]));
        const enriched = (simpleNotes || []).map((n: any) => ({
          ...n,
          creator: n.created_by ? { id: n.created_by, name: creatorMap.get(n.created_by) || 'Staff Member' } : null
        }));
        return NextResponse.json(enriched);
      }

      const enriched = (simpleNotes || []).map((n: any) => ({ ...n, creator: null }));
      return NextResponse.json(enriched);
    }

    return NextResponse.json(notes);
  } catch (err: any) {
    console.error('GET /api/employees/notes error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { employeeId, note, createdBy } = await req.json();

    if (!employeeId || !note) {
      return NextResponse.json({ error: 'employeeId and note content are required.' }, { status: 400 });
    }

    const { data: newNote, error } = await supabaseServer
      .from('employee_notes')
      .insert({
        employee_id: employeeId,
        note: note.trim(),
        created_by: createdBy || null
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch creator info to enrich response
    let creator = null;
    if (newNote.created_by) {
      const { data: emp } = await supabaseServer
        .from('employee_accounts')
        .select('id, name')
        .eq('id', newNote.created_by)
        .maybeSingle();
      if (emp) creator = emp;
    }

    return NextResponse.json({
      ...newNote,
      creator
    }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/employees/notes error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Note ID is required.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer
      .from('employee_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/employees/notes error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
