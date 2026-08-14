import * as Location from "expo-location";

import type { EntryLocation } from "@/types/entry";

const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
/** Match Expo `LocationLastKnownOptions.maxAge` — OS-cached coords. */
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const LAST_KNOWN_MAX_ACCURACY_M = 2000;

export interface LocationFetchOptions {
  isCancelled?: () => boolean;
}

function placeLabel(place: Location.LocationGeocodedAddress): string | undefined {
  const locality = place.city || place.subregion || place.district;
  const parts = [locality, place.region, place.country].filter(Boolean);
  const unique = parts.filter((part, index) => part !== parts[index - 1]);
  if (!unique.length) return undefined;
  return unique.join(", ");
}

export function formatLocationCoordinates(location: EntryLocation): string {
  return `${location.latitude}, ${location.longitude}`;
}

export const LOCATION_UNAVAILABLE = "Not available";

export function locationPlaceTitle(location: EntryLocation): string {
  return location.name ?? "Location";
}

export function locationAccessibilityLabel(location: EntryLocation): string {
  return `${locationPlaceTitle(location)}, ${formatLocationCoordinates(location)}`;
}

async function sleep(ms: number, isCancelled?: () => boolean): Promise<void> {
  const step = 200;
  let elapsed = 0;
  while (elapsed < ms) {
    if (isCancelled?.()) return;
    const wait = Math.min(step, ms - elapsed);
    await new Promise((resolve) => setTimeout(resolve, wait));
    elapsed += wait;
  }
}

async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | undefined> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places[0]) return placeLabel(places[0]);
  } catch {
    // optional
  }
  return undefined;
}

async function coordsToPlace(latitude: number, longitude: number): Promise<EntryLocation> {
  const name = await reverseGeocode(latitude, longitude);
  return { latitude, longitude, name };
}

/**
 * OS last-known fix (fast). Expo docs recommend this before `getCurrentPositionAsync`.
 * @see https://docs.expo.dev/versions/latest/sdk/location/#locationgetlastknownpositionasyncoptions
 */
async function readLastKnown(): Promise<Location.LocationObject | null> {
  return Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
    requiredAccuracy: LAST_KNOWN_MAX_ACCURACY_M,
  });
}

async function readFreshPosition(isCancelled?: () => boolean): Promise<Location.LocationObject | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (isCancelled?.()) return null;

    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch {
      if (attempt < MAX_ATTEMPTS && !isCancelled?.()) {
        await sleep(RETRY_DELAY_MS, isCancelled);
      }
    }
  }

  return null;
}

/**
 * Resolves place label from GPS. Uses OS cache first, then a fresh fix if needed.
 */
export async function fetchPlace(
  options: LocationFetchOptions = {}
): Promise<EntryLocation | null> {
  const { isCancelled } = options;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted" || isCancelled?.()) return null;

  let position = await readLastKnown();
  if (!position && !isCancelled?.()) {
    position = await readFreshPosition(isCancelled);
  }

  if (!position || isCancelled?.()) return null;

  return coordsToPlace(position.coords.latitude, position.coords.longitude);
}
