const url = 'https://whmukkypceuizscpjcdo.supabase.co/rest/v1/providers';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobXVra3lwY2V1aXpzY3BqY2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDM5MzEsImV4cCI6MjA5NzM3OTkzMX0.38v8UPGgJao4Tm0bDNfqlZm1lV4jiJV89jCl8C69Xb8';

const newProvider = {
  name: 'Dr. saif zaki',
  bookings_count: 0,
  services: ['Rehabilitation'],
  more_count: 0,
  rating: 5.0
};

fetch(url, {
  method: 'POST',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify(newProvider)
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
})
.catch(err => console.error('Fetch error:', err));
