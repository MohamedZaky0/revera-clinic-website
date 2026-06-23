async function fetchSettings() {
  try {
    const res = await fetch("http://localhost:3000/api/page-settings", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      console.log("API returned aboutPage keys:", Object.keys(data.aboutPage || {}));
      console.log("whatWeDoImage1:", data.aboutPage?.whatWeDoImage1);
      console.log("whatWeDoImage2:", data.aboutPage?.whatWeDoImage2);
    } else {
      console.error("API response error:", res.status);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

fetchSettings();
