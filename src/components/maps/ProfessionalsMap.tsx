'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MapProfessional {
  uid: string;
  businessName: string;
  specialties: string[];
  rating: number;
  latitude: number;
  longitude: number;
}

interface ProfessionalsMapProps {
  professionals: MapProfessional[];
  height?: string;
  className?: string;
  onMarkerClick?: (uid: string) => void;
}

// Global script loader (shared with other map components)
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (googleMapsLoaded && window.google?.maps) {
      resolve();
      return;
    }
    if (googleMapsLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }
    googleMapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });
}

export default function ProfessionalsMap({
  professionals,
  height = '400px',
  className = '',
  onMarkerClick,
}: ProfessionalsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    // Default center: France
    const defaultCenter = { lat: 46.603354, lng: 1.888334 };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    setLoading(false);
  }, []);

  // Update markers when professionals change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (professionals.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    professionals.forEach((pro) => {
      const position = { lat: pro.latitude, lng: pro.longitude };

      const marker = new google.maps.Marker({
        position,
        map,
        title: pro.businessName,
        animation: google.maps.Animation.DROP,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#14B8A6', // brand-teal
          fillOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const infoWindow = infoWindowRef.current;
        if (!infoWindow) return;

        const ratingStars = pro.rating > 0
          ? `<span style="color:#F59E0B;font-weight:bold">${pro.rating.toFixed(1)} ★</span>`
          : '<span style="color:#94A3B8">Nouveau</span>';

        infoWindow.setContent(`
          <div style="padding:8px;min-width:180px;font-family:system-ui,-apple-system,sans-serif">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:#0D3B42">${pro.businessName}</div>
            <div style="font-size:12px;color:#14B8A6;margin-bottom:4px">${pro.specialties.slice(0, 2).join(', ')}</div>
            <div style="font-size:12px;margin-bottom:8px">${ratingStars}</div>
            <a href="/profil/${pro.uid}" style="display:inline-block;background:#14B8A6;color:white;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600">
              Voir le profil
            </a>
          </div>
        `);
        infoWindow.open(map, marker);

        if (onMarkerClick) onMarkerClick(pro.uid);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    // Fit map to show all markers
    if (professionals.length === 1) {
      map.setCenter({ lat: professionals[0].latitude, lng: professionals[0].longitude });
      map.setZoom(14);
    } else {
      map.fitBounds(bounds, { padding: 50 });
    }
  }, [professionals, onMarkerClick]);

  useEffect(() => {
    if (!apiKey) {
      setError('Clé API Google Maps non configurée');
      setLoading(false);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => initMap())
      .catch(() => {
        setError('Impossible de charger Google Maps');
        setLoading(false);
      });
  }, [apiKey, initMap]);

  if (error) {
    return null; // Silently hide map if not configured
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 rounded-xl flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden" />
    </div>
  );
}
