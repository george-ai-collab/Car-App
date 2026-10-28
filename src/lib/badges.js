import { tr } from "./i18n";
// Spotting badges are computed from data the app already stores — nothing extra is saved.

export const SPOT_BADGES = [
  { count: 1, name: tr("First Find"), tone: "warm" },
  { count: 5, name: tr("Spotter"), tone: "warm" },
  { count: 15, name: tr("Scout"), tone: "accent2" },
  { count: 30, name: tr("Hunter"), tone: "accent2" },
  { count: 75, name: tr("Legend"), tone: "accent" },
];

export const VARIETY_BADGES = [
  { count: 3, name: tr("Explorer"), tone: "warm" },
  { count: 6, name: tr("Collector"), tone: "accent2" },
  { count: 10, name: tr("Connoisseur"), tone: "accent" },
];

function spotStats(username, cars, sightings) {
  const spottedCars = Object.values(cars).filter((c) => c.spotterUsernames.includes(username));
  const unmatched = Object.values(sightings || {}).filter((s) => s.spotterUsername === username && !s.matchedCarId);
  const makes = new Set([
    ...spottedCars.map((c) => c.make.toLowerCase()),
    ...unmatched.map((s) => s.make.toLowerCase()),
  ]);
  return { spotCount: spottedCars.length + unmatched.length, uniqueMakes: makes.size };
}

export function computeBadges(username, cars, sightings) {
  const { spotCount, uniqueMakes } = spotStats(username, cars, sightings);
  const earned = [];
  for (const b of SPOT_BADGES) if (spotCount >= b.count) earned.push({ ...b, kind: "spot" });
  for (const b of VARIETY_BADGES) if (uniqueMakes >= b.count) earned.push({ ...b, kind: "variety" });
  return earned;
}

export function nextBadgeProgress(username, cars, sightings) {
  const { spotCount } = spotStats(username, cars, sightings);
  const next = SPOT_BADGES.find((b) => spotCount < b.count);
  return next ? { needed: next.count - spotCount, name: next.name } : null;
}
