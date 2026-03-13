// Google Maps JavaScript API type declarations
// This is a minimal declaration to avoid installing @types/google.maps

declare namespace google.maps {
  class Map {
    constructor(mapDiv: HTMLElement, opts?: MapOptions);
    setCenter(center: LatLngLiteral): void;
    setZoom(zoom: number): void;
    panTo(latLng: LatLngLiteral): void;
    fitBounds(bounds: LatLngBounds, padding?: number | { padding: number }): void;
  }

  class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latLng: LatLngLiteral): void;
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }

  class InfoWindow {
    constructor(opts?: { content?: string });
    setContent(content: string): void;
    open(map: Map, anchor?: Marker): void;
    close(): void;
  }

  class LatLngBounds {
    constructor();
    extend(point: LatLngLiteral): void;
  }

  class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    scrollwheel?: boolean;
    draggable?: boolean;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    styles?: any[];
  }

  interface MarkerOptions {
    position?: LatLngLiteral;
    map?: Map;
    title?: string;
    animation?: number;
    icon?: any;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  enum SymbolPath {
    CIRCLE = 0,
  }

  enum Animation {
    DROP = 2,
    BOUNCE = 1,
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  namespace places {
    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
      addListener(event: string, handler: () => void): void;
      getPlace(): PlaceResult;
    }

    interface AutocompleteOptions {
      types?: string[];
      componentRestrictions?: { country: string | string[] };
      fields?: string[];
    }

    interface PlaceResult {
      address_components?: GeocoderAddressComponent[];
      formatted_address?: string;
      geometry?: {
        location: LatLng;
      };
    }
  }
}

interface Window {
  google?: {
    maps?: typeof google.maps & {
      places?: typeof google.maps.places;
    };
  };
}
