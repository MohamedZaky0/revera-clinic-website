async function test() {
  const urls = [
    "http://localhost:3000/api/services",
    "http://localhost:3000/api/categories",
    "http://localhost:3000/api/providers",
    "http://localhost:3000/api/reservations"
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`\nURL: ${url}`);
      console.log(`Status: ${res.status}`);
      const data = await res.json();
      if (res.status === 200) {
        console.log(`Returned ${Array.isArray(data) ? data.length : "object"} items.`);
        if (Array.isArray(data) && data.length > 0) {
          console.log("First item:", data[0]);
        }
      } else {
        console.log("Error response:", data);
      }
    } catch (e) {
      console.error(`Fetch failed for ${url}:`, e.message);
    }
  }
}
test();
