const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://whmukkypceuizscpjcdo.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobXVra3lwY2V1aXpzY3BqY2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDM5MzEsImV4cCI6MjA5NzM3OTkzMX0.38v8UPGgJao4Tm0bDNfqlZm1lV4jiJV89jCl8C69Xb8';

const clientInstance = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    flowType: 'pkce',
  },
});

const body = {
  name: 'Dr. saif zaki 2',
  rating: 5.0,
  services: ['Rehabilitation'],
  bookings: 0,
  more: 0
};

const providersToUpsert = [{
  name: body.name,
  bookings_count: body.bookings || 0,
  services: body.services || [],
  more_count: body.more || 0,
  rating: body.rating || 0,
}];

clientInstance
  .from('providers')
  .upsert(providersToUpsert)
  .select()
  .then(({ data, error }) => {
    if (error) {
      console.error('Upsert failed with error:', error);
    } else {
      console.log('Upsert succeeded with data:', data);
    }
  })
  .catch(err => {
    console.error('Promise error:', err);
  });
