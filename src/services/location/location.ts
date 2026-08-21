import * as Location from "expo-location";

import type { EntryLocation } from "@/shared/types";

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const LAST_KNOWN_MAX_ACCURACY_M = 2000;

export const LOCATION_UNAVAILABLE = "Not available";

/**
 * Normalizes geocoded address components into a single canonical format:
 * "Locality, Region, Country" with consecutive and empty deduplication.
 * e.g. "Siliguri, West Bengal, India", "Austin, Texas, United States"
 */
export function formatGeocodedAddress(
  address: Location.LocationGeocodedAddress
): string | undefined {
  const getField = (val: string | null | undefined) =>
    val && val.trim().length > 0 ? val.trim() : null;

  const city = getField(address.city);
  const district = getField(address.district);
  const subregion = getField(address.subregion);
  const street = getField(address.street);
  const name = getField(address.name);
  const region = getField(address.region);
  const country = getField(address.country);

  const locality = city || district || subregion || street || name;
  const parts = [locality, region, country].filter(Boolean) as string[];
  const unique = parts.filter((part, index) => part !== parts[index - 1]);

  if (!unique.length) return undefined;
  return unique.join(", ");
}

/**
 * Returns the canonical display name for an EntryLocation.
 * Used consistently across all surfaces: Timeline, View/Reader, Details modal, Memory, etc.
 */
export function locationPlaceTitle(location?: EntryLocation | null): string {
  if (!location) return LOCATION_UNAVAILABLE;
  if (location.name && location.name.trim()) {
    return location.name.trim();
  }
  return "Location";
}

/** Canonical coordinate string representation. */
export function formatLocationCoordinates(location: EntryLocation): string {
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

export function locationAccessibilityLabel(location: EntryLocation): string {
  return `${locationPlaceTitle(location)}, ${formatLocationCoordinates(location)}`;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string | undefined> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0 && places[0]) {
        const formatted = formatGeocodedAddress(places[0]);
        if (formatted) return formatted;
      }
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  return undefined;
}

async function coordsToPlace(latitude: number, longitude: number): Promise<EntryLocation> {
  const name = await reverseGeocode(latitude, longitude);
  return { latitude, longitude, name };
}

async function readPosition(): Promise<Location.LocationObject | null> {
  // First attempt fresh position fix
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  // Fallback to last known position if fresh fix fails
  try {
    return await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
    });
  } catch {
    return null;
  }
}

/**
 * Resolves place label from GPS on explicit user action.
 *
 * Permission determines whether the app is allowed to access location.
 * Compose determines whether the app should actually use it.
 *
 * `prompt: true` requests OS permission if not yet granted.
 */
export async function fetchPlace(
  options: { prompt?: boolean } = {}
): Promise<EntryLocation | null> {
  const { prompt = false } = options;

  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    if (!prompt) return null;
    if (permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (permission.status !== "granted") {
      return null;
    }
  }

  const position = await readPosition();
  if (!position) return null;

  return coordsToPlace(position.coords.latitude, position.coords.longitude);
}
