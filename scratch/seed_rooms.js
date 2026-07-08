const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    // 1. Get branches
    const { data: branches, error: bErr } = await supabase.from('branches').select('id, name_en');
    if (bErr) throw bErr;

    const newCairoBranch = branches.find(b => b.name_en === 'New Cairo Branch');
    const zayedBranch = branches.find(b => b.name_en === 'Sheikh Zayed Branch');

    if (!newCairoBranch || !zayedBranch) {
      console.error('Branches not found in database. Make sure you have branches seeded.');
      return;
    }

    console.log('Seeding rooms for New Cairo:', newCairoBranch.id);
    console.log('Seeding rooms for Sheikh Zayed:', zayedBranch.id);

    // 2. Check if rooms are already seeded
    const { data: existingRooms, error: rErr } = await supabase.from('rooms').select('id');
    if (rErr) throw rErr;

    if (existingRooms && existingRooms.length > 0) {
      console.log(`Rooms table already has ${existingRooms.length} records. Skipping room seeding.`);
      return;
    }

    // 3. Insert Rooms
    const roomsToInsert = [
      // New Cairo
      { name: 'New Cairo Reception', type: 'administrative', status: 'available', branch_id: newCairoBranch.id },
      { name: 'New Cairo Manager Office', type: 'administrative', status: 'available', branch_id: newCairoBranch.id },
      { name: 'Laser Room NC 1', type: 'clinical', status: 'available', branch_id: newCairoBranch.id },
      { name: 'Laser Room NC 2', type: 'clinical', status: 'available', branch_id: newCairoBranch.id },
      { name: 'Dermatology Room NC 1', type: 'clinical', status: 'available', branch_id: newCairoBranch.id },
      { name: 'Gynecology Room NC 1', type: 'clinical', status: 'available', branch_id: newCairoBranch.id },
      { name: 'Physiotherapy Room NC 1', type: 'clinical', status: 'available', branch_id: newCairoBranch.id },

      // Sheikh Zayed
      { name: 'Zayed Reception', type: 'administrative', status: 'available', branch_id: zayedBranch.id },
      { name: 'Zayed Manager Office', type: 'administrative', status: 'available', branch_id: zayedBranch.id },
      { name: 'Laser Room ZY 1', type: 'clinical', status: 'available', branch_id: zayedBranch.id },
      { name: 'Laser Room ZY 2', type: 'clinical', status: 'available', branch_id: zayedBranch.id },
      { name: 'Dermatology Room ZY 1', type: 'clinical', status: 'available', branch_id: zayedBranch.id },
      { name: 'Gynecology Room ZY 1', type: 'clinical', status: 'available', branch_id: zayedBranch.id },
      { name: 'Physiotherapy Room ZY 1', type: 'clinical', status: 'available', branch_id: zayedBranch.id }
    ];

    const { data: insertedRooms, error: insertRoomsErr } = await supabase
      .from('rooms')
      .insert(roomsToInsert)
      .select();

    if (insertRoomsErr) throw insertRoomsErr;
    console.log(`Successfully seeded ${insertedRooms.length} rooms!`);

    // 4. Seed Service Rooms Compatibility Junctions
    const serviceRoomsToInsert = [];

    // Laser Hair Removal (id=5) -> all Laser Rooms
    const laserRooms = insertedRooms.filter(r => r.name.startsWith('Laser Room'));
    laserRooms.forEach(lr => {
      serviceRoomsToInsert.push({ service_id: 5, room_id: lr.id });
    });

    // Skin Dermatology Clinics (id=1) -> all Dermatology Rooms
    const dermatologyRooms = insertedRooms.filter(r => r.name.startsWith('Dermatology Room'));
    dermatologyRooms.forEach(dr => {
      serviceRoomsToInsert.push({ service_id: 1, room_id: dr.id });
    });

    // Gynecology Clinics (id=11) -> all Gynecology Rooms
    const gynecologyRooms = insertedRooms.filter(r => r.name.startsWith('Gynecology Room'));
    gynecologyRooms.forEach(gr => {
      serviceRoomsToInsert.push({ service_id: 11, room_id: gr.id });
    });

    // Physical Therapy (id=21) -> all Physiotherapy Rooms
    const physiotherapyRooms = insertedRooms.filter(r => r.name.startsWith('Physiotherapy Room'));
    physiotherapyRooms.forEach(pr => {
      serviceRoomsToInsert.push({ service_id: 21, room_id: pr.id });
    });

    const { error: srInsertErr } = await supabase
      .from('service_rooms')
      .insert(serviceRoomsToInsert);

    if (srInsertErr) throw srInsertErr;
    console.log(`Successfully seeded ${serviceRoomsToInsert.length} service-room compatibility junctions!`);

  } catch (err) {
    console.error('Seeding error:', err);
  }
}

run();
