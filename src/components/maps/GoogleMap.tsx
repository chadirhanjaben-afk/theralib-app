'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface GoogleMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: string;
  markerTitle?: string;
  className?: string;
  interactive?: boolean; // allow pan/zoom
}

// Global tracking to avoid loading the script multiple times
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
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

export default function GoogleMap({
  latitude,
  longitude,
  zoom = 15,
  height = '200px',
  markerTitle,
  className = '',
  interactive = true,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const center = { lat: latitude, lng: longitude };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: !interactive,
      zoomControl: interactive,
      scrollwheel: interactive,
      draggable: interactive,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: interactive,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    const marker = new google.maps.Marker({
      position: center,
      map,
      title: markerTitle || '',
      animation: google.maps.Animation.DROP,
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setLoading(false);
  }, [latitude, longitude, zoom, markerTitle, interactive]);

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

  // Update marker position when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const pos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    }
  }, [latitude, longitude]);

  if (error) {
    return (
      <div
        className={`bg-gray-100 rounded-xl flex items-center justify-center text-sm text-gray-400 ${className}`}
        style={{ height }}
      >
        {error}
      </div>
    );
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
