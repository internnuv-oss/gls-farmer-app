// src/core/roadsApi.ts

// Access the API key from your environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export const getSnappedRoute = async (coordinates: {lat: number, lng: number}[]) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("Missing Google Maps API Key");
    return coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }));
  }

  // Google restricts requests to 100 points maximum per URL. 
  // Because our SQLite Decimation logic ensures sparse arrays, we can safely slice the first 100.
  const safeCoordinates = coordinates.slice(0, 100);
  
  if (safeCoordinates.length === 0) return [];

  // Google expects a pipe-separated string of lat,lng
  const pathString = safeCoordinates.map(c => `${c.lat},${c.lng}`).join('|');
  
  // interpolate=true asks Google to physically draw the curves between our straight lines
  const url = `https://roads.googleapis.com/v1/snapToRoads?path=${pathString}&interpolate=true&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // If Google successfully maps it, convert it to React Native Maps format
    if (data.snappedPoints && data.snappedPoints.length > 0) {
      return data.snappedPoints.map((point: any) => ({
        latitude: point.location.latitude,
        longitude: point.location.longitude
      }));
    }
    
    // Fallback if Google returns an API error or empty result
    console.warn("Google Roads API returned no snapped points.", data);
    return coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }));
    
  } catch (error) {
    console.error("Snap to Roads API request failed:", error);
    return coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }));
  }
};