'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AddressResult {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface AddressAutocompleteProps {
  defaultValue?: string;
  onAddressSelect: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

// Re-use the same script loader logic
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

function extractAddressComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string
): string {
  const comp = components.find((c) => c.types.includes(type));
  return comp?.long_name || '';
}

export default function AddressAutocomplete({
  defaultValue = '',
  onAddressSelect,
  placeholder = 'Rechercher une adresse...',
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'fr' },
      fields: ['address_components', 'geometry', 'formatted_address'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location || !place.address_components) return;

      const components = place.address_components;
      const streetNumber = extractAddressComponent(components, 'street_number');
      const route = extractAddressComponent(components, 'route');
      const street = streetNumber ? `${streetNumber} ${route}` : route;
      const city =
        extractAddressComponent(components, 'locality') ||
        extractAddressComponent(components, 'administrative_area_level_2');
      const postalCode = extractAddressComponent(components, 'postal_code');
      const country = extractAddressComponent(components, 'country');

      onAddressSelect({
        street,
        city,
        postalCode,
        country: country || 'France',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        formattedAddress: place.formatted_address || '',
      });
    });

    autocompleteRef.current = autocomplete;
    setReady(true);
  }, [onAddressSelect]);

  useEffect(() => {
    if (!apiKey) return;

    loadGoogleMapsScript(apiKey)
      .then(() => initAutocomplete())
      .catch((err) => console.error('Google Maps load error:', err));
  }, [apiKey, initAutocomplete]);

  if (!apiKey) {
    return (
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`input-field ${className}`}
        disabled
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={ready ? placeholder : 'Chargement...'}
        className={`input-field ${className}`}
        disabled={!ready}
      />
      {!ready && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
