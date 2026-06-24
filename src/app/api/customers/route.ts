import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get('mobile');
    const email = searchParams.get('email');

    if (mobile) {
      const { data, error } = await supabaseServer
        .from('customers')
        .select('*')
        .eq('mobile', mobile)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data || null);
    }

    if (email) {
      const { data, error } = await supabaseServer
        .from('customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json(data || null);
    }

    const { data: rows, error } = await supabaseServer
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(rows || []);
  } catch (err) {
    console.error('GET /api/customers error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const {
    id,
    name,
    mobile,
    gender,
    email,
    active,
    spent_amount,
    outstanding,
    area,
    location_name,
    street_name,
    building_no,
    floor_no,
    note
  } = body;

  if (!name || !mobile) {
    return NextResponse.json({ error: 'Name and Mobile number are required' }, { status: 400 });
  }

  const customerData = {
    name,
    mobile,
    gender: gender || null,
    email: email || null,
    active: active ?? true,
    spent_amount: Number(spent_amount || 0),
    outstanding: Number(outstanding || 0),
    area: area || null,
    location_name: location_name || null,
    street_name: street_name || null,
    building_no: building_no || null,
    floor_no: floor_no || null,
    note: note || null,
    updated_at: new Date().toISOString()
  };

  try {
    let result;
    if (id) {
      // Update existing customer
      const { data, error } = await supabaseServer
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new customer
      const { data, error } = await supabaseServer
        .from('customers')
        .insert({
          ...customerData,
          registration_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result, { status: id ? 200 : 201 });
  } catch (err: any) {
    console.error('POST /api/customers error:', err);
    // Handle uniqueness constraint violations gracefully
    if (err.code === '23505') {
      const field = err.message?.includes('mobile') ? 'Mobile number' : 'Email address';
      return NextResponse.json({ error: `${field} already exists for another customer.` }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (err: any) {
    console.error('DELETE /api/customers error:', err);
    return NextResponse.json({ error: err.message || 'Database error' }, { status: 500 });
  }
}
