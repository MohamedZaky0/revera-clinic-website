import https from 'https';

export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function extractCoordsFromUrlOrEmbed(urlStr: string): { latitude: number; longitude: number } | null {
  if (!urlStr) return null;
  try {
    const decoded = decodeURIComponent(urlStr);

    // Pattern 1: !2d31.45133!3d30.001242 (Embed format: 2d = lng, 3d = lat)
    const regex2d3d = /!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/;
    const match2d3d = decoded.match(regex2d3d);
    if (match2d3d) {
      return { latitude: parseFloat(match2d3d[2]), longitude: parseFloat(match2d3d[1]) };
    }

    // Pattern 2: !3d30.001242!4d31.45133 (Place pin format: 3d = lat, 4d = lng)
    const regex3d4d = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const match3d4d = decoded.match(regex3d4d);
    if (match3d4d) {
      return { latitude: parseFloat(match3d4d[1]), longitude: parseFloat(match3d4d[2]) };
    }

    // Pattern 3: /@30.001242,31.45133
    const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchAt = decoded.match(regexAt);
    if (matchAt) {
      return { latitude: parseFloat(matchAt[1]), longitude: parseFloat(matchAt[2]) };
    }

    // Pattern 4: ?q=30.001242,31.45133 or query=30.001242,31.45133 or ll=30.001242,31.45133
    const regexQ = /[?&](?:q|query|ll|daddr|saddr|center)=(-?\d+\.\d+),(-?\d+\.\d+)/i;
    const matchQ = decoded.match(regexQ);
    if (matchQ) {
      return { latitude: parseFloat(matchQ[1]), longitude: parseFloat(matchQ[2]) };
    }

    // Pattern 5: place/30.001242,31.45133
    const regexPlace = /place\/(-?\d+\.\d+),(-?\d+\.\d+)/i;
    const matchPlace = decoded.match(regexPlace);
    if (matchPlace) {
      return { latitude: parseFloat(matchPlace[1]), longitude: parseFloat(matchPlace[2]) };
    }
  } catch (err) {
    console.error('Error parsing coords from URL:', err);
  }
  return null;
}

export function getFinalUrl(targetUrl: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const options = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 5000,
      };

      const req = https.get(targetUrl, options, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(getFinalUrl(res.headers.location));
        } else {
          resolve(targetUrl);
        }
      });

      req.on('error', () => {
        resolve(targetUrl);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(targetUrl);
      });
    } catch {
      resolve(targetUrl);
    }
  });
}

export async function extractCoordsFromMapsLink(mapsLink: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!mapsLink) return null;
  const syncCoords = extractCoordsFromUrlOrEmbed(mapsLink);
  if (syncCoords) return syncCoords;

  try {
    const finalUrl = await getFinalUrl(mapsLink);
    return extractCoordsFromUrlOrEmbed(finalUrl);
  } catch (err) {
    console.error('Error resolving maps link coordinates:', err);
  }
  return null;
}

export async function resolveBranchCoordinates(branch: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  maps_embed?: string | null;
  maps_link?: string | null;
  name_en?: string | null;
  name_ar?: string | null;
  id?: string | null;
}): Promise<{ latitude: number; longitude: number } | null> {
  const lat = branch.latitude ? Number(branch.latitude) : null;
  const lng = branch.longitude ? Number(branch.longitude) : null;

  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
    return { latitude: lat, longitude: lng };
  }

  if (branch.maps_embed) {
    const parsed = extractCoordsFromUrlOrEmbed(branch.maps_embed);
    if (parsed) return parsed;
  }

  if (branch.maps_link) {
    const parsed = await extractCoordsFromMapsLink(branch.maps_link);
    if (parsed) return parsed;
  }

  // Fallback default coordinates for known clinic locations if maps link is missing or unresolvable
  const bName = String(branch.name_en || branch.name_ar || branch.id || "").toLowerCase();
  if (bName.includes("zayed") || bName.includes("sheikh") || bName.includes("زايد") || bName.includes("شيخ")) {
    return { latitude: 30.0131, longitude: 30.9876 };
  }
  if (
    bName.includes("cairo") ||
    bName.includes("tagamoa") ||
    bName.includes("fifth") ||
    bName.includes("settlement") ||
    bName.includes("القاهرة") ||
    bName.includes("تجمع") ||
    bName.includes("خامس")
  ) {
    return { latitude: 30.0263, longitude: 31.4913 };
  }
  if (bName.includes("maadi") || bName.includes("معادي")) {
    return { latitude: 29.9602, longitude: 31.2569 };
  }
  if (bName.includes("heliopolis") || bName.includes("مصر الجديدة") || bName.includes("مدينة نصر") || bName.includes("nasr")) {
    return { latitude: 30.0886, longitude: 31.3323 };
  }
  if (bName.includes("alex") || bName.includes("إسكندرية") || bName.includes("اسكندرية")) {
    return { latitude: 31.2001, longitude: 29.9187 };
  }

  return null;
}
