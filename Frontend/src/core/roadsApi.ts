// src/core/roadsApi.ts

// Access the API key from your environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export const getSnappedRoute = async (coordinates: {lat: number, lng: number}[]) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Missing Google Maps API Key");
    return coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }));
  }

  if (coordinates.length === 0) return [];

  let allSnappedPoints: any[] = [];

  // 🚀 THE CHUNKING FIX: Process all points in blocks of 90 to stay under Google's 100 point limit.
  // We use chunks to ensure the entire route is drawn, no matter how long the shift is.
  for (let i = 0; i < coordinates.length; i += 90) {
    const chunk = coordinates.slice(i, i + 100);
    const pathString = chunk.map(c => `${c.lat},${c.lng}`).join('|');
    
    // interpolate=true asks Google to physically draw the curves between our straight lines
    const url = `https://roads.googleapis.com/v1/snapToRoads?path=${pathString}&interpolate=true&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // If Google successfully maps it, convert it to React Native Maps format
      if (data.snappedPoints && data.snappedPoints.length > 0) {
        const mappedChunk = data.snappedPoints.map((point: any) => ({
          latitude: point.location.latitude,
          longitude: point.location.longitude
        }));
        allSnappedPoints = [...allSnappedPoints, ...mappedChunk];
      } else {
        // Fallback if Google returns an API error or empty result for this specific chunk
        console.warn("Google Roads API returned no snapped points for chunk.", data);
        allSnappedPoints = [...allSnappedPoints, ...chunk.map(c => ({ latitude: c.lat, longitude: c.lng }))];
      }
      
    } catch (error) {
      console.error("Snap to Roads API request failed for chunk:", error);
      allSnappedPoints = [...allSnappedPoints, ...chunk.map(c => ({ latitude: c.lat, longitude: c.lng }))];
    }
  }

  return allSnappedPoints;
};