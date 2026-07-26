export type StarRecord = {
  id: string;
  name: string;
  ra: number;
  dec: number;
  magnitude: number;
  distance: string;
  constellation: string;
  temperature: string;
  spectralType: string;
  radius: string;
  description: string;
};

export type SkyPoint = {
  altitude: number;
  azimuth: number;
};

export type ProjectedStar = StarRecord & {
  altitude: number;
  azimuth: number;
  x: number;
  y: number;
  size: number;
};

export const STAR_CATALOG: StarRecord[] = [
  { id: 'sirius', name: 'Sirius', ra: 6.7525, dec: -16.716, magnitude: -1.46, distance: '8.6 ly', constellation: 'Canis Major', temperature: '9,940 K', spectralType: 'A1V', radius: '1.71 R☉', description: 'The brightest star in Earth’s night sky, a blue-white binary system known as the Dog Star.' },
  { id: 'canopus', name: 'Canopus', ra: 6.3992, dec: -52.6957, magnitude: -0.74, distance: '310 ly', constellation: 'Carina', temperature: '7,350 K', spectralType: 'A9II', radius: '71.4 R☉', description: 'A luminous supergiant that guides spacecraft through deep space.' },
  { id: 'arcturus', name: 'Arcturus', ra: 14.261, dec: 19.1825, magnitude: -0.05, distance: '36.7 ly', constellation: 'Boötes', temperature: '4,286 K', spectralType: 'K1.5III', radius: '25.4 R☉', description: 'A warm orange giant and the brightest star in the northern celestial hemisphere.' },
  { id: 'vega', name: 'Vega', ra: 18.6156, dec: 38.7837, magnitude: 0.03, distance: '25.0 ly', constellation: 'Lyra', temperature: '9,602 K', spectralType: 'A0V', radius: '2.36 R☉', description: 'The anchor of the Summer Triangle and one of the most studied stars in astronomy.' },
  { id: 'capella', name: 'Capella', ra: 5.2782, dec: 45.998, magnitude: 0.08, distance: '42.9 ly', constellation: 'Auriga', temperature: '4,970 K', spectralType: 'G8III', radius: '12.2 R☉', description: 'A bright system of four stars that appears as a golden point above the northern horizon.' },
  { id: 'rigel', name: 'Rigel', ra: 5.2423, dec: -8.2016, magnitude: 0.13, distance: '860 ly', constellation: 'Orion', temperature: '12,100 K', spectralType: 'B8Ia', radius: '74.1 R☉', description: 'A blue supergiant marking Orion’s lower foot.' },
  { id: 'procyon', name: 'Procyon', ra: 7.655, dec: 5.225, magnitude: 0.38, distance: '11.5 ly', constellation: 'Canis Minor', temperature: '6,530 K', spectralType: 'F5IV', radius: '2.05 R☉', description: 'A nearby binary system whose name means “before the dog.”' },
  { id: 'betelgeuse', name: 'Betelgeuse', ra: 5.9195, dec: 7.4071, magnitude: 0.42, distance: '640 ly', constellation: 'Orion', temperature: '3,500 K', spectralType: 'M1–M2Ia', radius: '764 R☉', description: 'A red supergiant at Orion’s shoulder, large enough to reach beyond Mars if placed in our Solar System.' },
  { id: 'altair', name: 'Altair', ra: 19.8464, dec: 8.8683, magnitude: 0.77, distance: '16.7 ly', constellation: 'Aquila', temperature: '7,680 K', spectralType: 'A7V', radius: '1.63 R☉', description: 'A rapidly spinning star at the southern point of the Summer Triangle.' },
  { id: 'aldebaran', name: 'Aldebaran', ra: 4.5987, dec: 16.5093, magnitude: 0.85, distance: '65.2 ly', constellation: 'Taurus', temperature: '3,910 K', spectralType: 'K5III', radius: '44.2 R☉', description: 'The fiery eye of Taurus, an orange giant near the Hyades cluster.' },
  { id: 'antares', name: 'Antares', ra: 16.4901, dec: -26.4319, magnitude: 1.09, distance: '550 ly', constellation: 'Scorpius', temperature: '3,400 K', spectralType: 'M1.5Iab', radius: '680 R☉', description: 'A red supergiant whose name means rival of Mars.' },
  { id: 'spica', name: 'Spica', ra: 13.4199, dec: -11.1614, magnitude: 0.98, distance: '250 ly', constellation: 'Virgo', temperature: '22,400 K', spectralType: 'B1III–IV', radius: '7.4 R☉', description: 'A hot blue-white binary system that marks the ear of wheat held by Virgo.' },
  { id: 'pollux', name: 'Pollux', ra: 7.7553, dec: 28.0262, magnitude: 1.14, distance: '34.0 ly', constellation: 'Gemini', temperature: '4,865 K', spectralType: 'K0III', radius: '8.8 R☉', description: 'An orange giant and the brighter twin of Gemini.' },
  { id: 'deneb', name: 'Deneb', ra: 20.6905, dec: 45.2803, magnitude: 1.25, distance: '2,600 ly', constellation: 'Cygnus', temperature: '8,525 K', spectralType: 'A2Ia', radius: '203 R☉', description: 'A blue-white supergiant at the tail of the Swan and the farthest point of the Summer Triangle.' },
  { id: 'regulus', name: 'Regulus', ra: 10.1395, dec: 11.9672, magnitude: 1.35, distance: '79.3 ly', constellation: 'Leo', temperature: '12,460 K', spectralType: 'B7V', radius: '3.09 R☉', description: 'The heart of Leo, a fast-spinning blue star with a companion system.' },
  { id: 'fomalhaut', name: 'Fomalhaut', ra: 22.9608, dec: -29.6222, magnitude: 1.16, distance: '25.1 ly', constellation: 'Piscis Austrinus', temperature: '8,590 K', spectralType: 'A3V', radius: '1.84 R☉', description: 'A solitary bright star surrounded by a young debris disk.' },
  { id: 'polaris', name: 'Polaris', ra: 2.5303, dec: 89.2641, magnitude: 1.98, distance: '433 ly', constellation: 'Ursa Minor', temperature: '6,015 K', spectralType: 'F7Ib', radius: '37.5 R☉', description: 'The North Star, almost precisely aligned with Earth’s northern rotation axis.' },
  { id: 'castor', name: 'Castor', ra: 7.5767, dec: 31.8883, magnitude: 1.58, distance: '51.6 ly', constellation: 'Gemini', temperature: '10,286 K', spectralType: 'A1V', radius: '2.3 R☉', description: 'A fascinating sextuple star system that forms one of Gemini’s twins.' },
  { id: 'bellatrix', name: 'Bellatrix', ra: 5.4189, dec: 6.3497, magnitude: 1.64, distance: '250 ly', constellation: 'Orion', temperature: '21,500 K', spectralType: 'B2III', radius: '5.75 R☉', description: 'The Amazon Star, a hot blue giant at Orion’s shoulder.' },
  { id: 'alnilam', name: 'Alnilam', ra: 5.6036, dec: -1.2019, magnitude: 1.69, distance: '2,000 ly', constellation: 'Orion', temperature: '27,000 K', spectralType: 'B0Ia', radius: '32.4 R☉', description: 'The central and most luminous star in Orion’s Belt.' },
  { id: 'alnitak', name: 'Alnitak', ra: 5.6793, dec: -1.9426, magnitude: 1.74, distance: '1,260 ly', constellation: 'Orion', temperature: '31,000 K', spectralType: 'O9.5Ib', radius: '28.5 R☉', description: 'The easternmost star of Orion’s Belt, near the Horsehead Nebula.' },
  { id: 'mintaka', name: 'Mintaka', ra: 5.5334, dec: 0.2992, magnitude: 2.23, distance: '1,200 ly', constellation: 'Orion', temperature: '29,500 K', spectralType: 'O9.5II', radius: '16.5 R☉', description: 'The westernmost star of Orion’s Belt, actually a multiple system.' },
  { id: 'denebola', name: 'Denebola', ra: 11.8177, dec: 14.572, magnitude: 2.14, distance: '36.2 ly', constellation: 'Leo', temperature: '8,500 K', spectralType: 'A3V', radius: '1.73 R☉', description: 'The tail of Leo and a nearby star with a dusty debris disk.' },
  { id: 'kochab', name: 'Kochab', ra: 14.8451, dec: 74.1555, magnitude: 2.08, distance: '130.9 ly', constellation: 'Ursa Minor', temperature: '4,030 K', spectralType: 'K4III', radius: '42.1 R☉', description: 'The orange guardian of the Little Bear, second-brightest in Ursa Minor.' },
  { id: 'achernar', name: 'Achernar', ra: 1.6286, dec: -57.2368, magnitude: 0.46, distance: '139 ly', constellation: 'Eridanus', temperature: '14,900 K', spectralType: 'B6Vep', radius: '7.3 R☉', description: 'A rapidly rotating blue star with one of the most oblate shapes known.' },
  { id: 'hadar', name: 'Hadar', ra: 14.0637, dec: -60.373, magnitude: 0.61, distance: '390 ly', constellation: 'Centaurus', temperature: '25,000 K', spectralType: 'B1III', radius: '8.6 R☉', description: 'A hot blue triple system and one of the closest bright stars to the Southern Cross.' },
  { id: 'mimosa', name: 'Mimosa', ra: 12.7953, dec: -59.6888, magnitude: 1.25, distance: '280 ly', constellation: 'Crux', temperature: '27,000 K', spectralType: 'B0.5IV', radius: '8.4 R☉', description: 'A blue-white star forming the eastern arm of the Southern Cross.' },
  { id: 'acrux', name: 'Acrux', ra: 12.4433, dec: -63.0991, magnitude: 0.76, distance: '320 ly', constellation: 'Crux', temperature: '28,000 K', spectralType: 'B0.5IV', radius: '8.1 R☉', description: 'The brightest star in the Southern Cross and a blue multiple system.' },
  { id: 'maia', name: 'Maia', ra: 3.8097, dec: 24.0067, magnitude: 3.87, distance: '344 ly', constellation: 'Taurus', temperature: '12,600 K', spectralType: 'B8III', radius: '6.4 R☉', description: 'A bright member of the Pleiades open star cluster.' },
  { id: 'alpheratz', name: 'Alpheratz', ra: 0.1398, dec: 29.0904, magnitude: 2.06, distance: '97 ly', constellation: 'Andromeda', temperature: '13,800 K', spectralType: 'B8IV', radius: '2.6 R☉', description: 'A blue-white star shared by the constellations Andromeda and Pegasus.' },
  { id: 'markab', name: 'Markab', ra: 23.0793, dec: 15.2053, magnitude: 2.49, distance: '133 ly', constellation: 'Pegasus', temperature: '9,660 K', spectralType: 'A0IV', radius: '4.7 R☉', description: 'One of the four stars outlining the Great Square of Pegasus.' },
  { id: 'scheat', name: 'Scheat', ra: 23.0629, dec: 28.0828, magnitude: 2.44, distance: '196 ly', constellation: 'Pegasus', temperature: '3,700 K', spectralType: 'M2.5II–III', radius: '95 R☉', description: 'A red giant at the northwest corner of Pegasus’s Great Square.' },
];

const DEG = Math.PI / 180;
const wrap360 = (value: number) => ((value % 360) + 360) % 360;
const wrap180 = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;

export function julianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function greenwichSiderealTime(date: Date): number {
  const jd = julianDate(date);
  const t = (jd - 2451545.0) / 36525;
  const degrees = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t - (t * t * t) / 38710000;
  return wrap360(degrees) / 15;
}

export function starAltitudeAzimuth(star: StarRecord, date: Date, latitude: number, longitude: number): SkyPoint {
  const lst = wrap360((greenwichSiderealTime(date) + longitude / 15) * 15);
  const hourAngle = wrap180(lst - star.ra * 15) * DEG;
  const dec = star.dec * DEG;
  const lat = latitude * DEG;
  const altitude = Math.asin(Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle));
  const azimuth = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat)) / DEG + 180;
  return { altitude: altitude / DEG, azimuth: wrap360(azimuth) };
}

export function projectStars(
  date: Date,
  latitude: number,
  longitude: number,
  heading: number,
  pitch: number,
  width: number,
  height: number,
): ProjectedStar[] {
  const horizontalFov = 72;
  const verticalFov = 52;
  return STAR_CATALOG.map((star) => {
    const point = starAltitudeAzimuth(star, date, latitude, longitude);
    const deltaAz = wrap180(point.azimuth - heading);
    const deltaAlt = point.altitude - pitch;
    const x = width / 2 + (deltaAz / horizontalFov) * width;
    const y = height / 2 - (deltaAlt / verticalFov) * height;
    const size = Math.max(2.4, Math.min(7.2, 7.2 - star.magnitude * 1.45));
    return { ...star, ...point, x, y, size };
  }).filter((star) =>
    star.altitude > -2 &&
    star.x > -36 &&
    star.x < width + 36 &&
    star.y > -36 &&
    star.y < height + 36
  ).sort((a, b) => a.magnitude - b.magnitude).slice(0, 16);
}
