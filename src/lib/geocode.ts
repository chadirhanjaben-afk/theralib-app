/**
 * Server-side geocoding utility using Google Maps Geocoding API.
 * Used as fallback when coordinates aren't available from Places Autocomplete.
 */

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${apiKey}&region=fr`
    );
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}
