/**
 * SkyFinder Astronomy Engine
 *
 * Full projection pipeline:
 *   RA/Dec
 *   → Alt/Az  (via Julian Date, GST, LST, hour angle)
 *   → ENU unit vector  (East-North-Up)
 *   → Device/camera frame  (via R^T where R = getRotationMatrix output)
 *   → Perspective projection  (focal-length based)
 *   → Screen coordinates
 *
 * Visibility uses a full 3D dot-product check:
 *   dot(cameraForward=(0,0,−1), starVec) > 0  →  starVec.z < 0
 *
 * This is the correct convention:
 *   Pitch = −90°  →  cameraElevation = +90°  →  zenith  →  stars visible
 *   Pitch =   0°  →  cameraElevation =   0°  →  horizon
 *   Pitch = +90°  →  cameraElevation = −90°  →  ground  →  no stars
 */

export type StarRecord = {
  id: string;
  name: string;
  ra: number;   // Right ascension in hours
  dec: number;  // Declination in degrees
  magnitude: number;
  distance: string;
  constellation: string;
  temperature: string;
  spectralType: string;
  radius: string;
  description: string;
};

export type SkyPoint = { altitude: number; azimuth: number };

export type ProjectedStar = StarRecord & {
  altitude: number;
  azimuth: number;
  x: number;
  y: number;
  size: number;
};

/**
 * 9-element row-major rotation matrix (Android SensorManager convention).
 *
 * Each ROW is a world (ENU) axis expressed in device frame:
 *   R[0..2] = East  axis in device frame  (H vector)
 *   R[3..5] = North axis in device frame  (M vector)
 *   R[6..8] = Up    axis in device frame  (A vector = normalised accel)
 *
 * Since R maps DEVICE → WORLD (v_world = R * v_device),
 * the ENU → device transform is the transpose:
 *   v_device = R^T * v_ENU
 *
 * For a column vector v_ENU = (E, N, U):
 *   v_device.x = R[0]*E + R[3]*N + R[6]*U  (dot with column 0 of R)
 *   v_device.y = R[1]*E + R[4]*N + R[7]*U
 *   v_device.z = R[2]*E + R[5]*N + R[8]*U
 */
export type RotationMatrix = [
  number, number, number,
  number, number, number,
  number, number, number,
];

const DEG = Math.PI / 180;
const wrap360 = (v: number) => ((v % 360) + 360) % 360;
const wrap180 = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;

// ─── Time & Coordinate Transforms ────────────────────────────────────────────

export function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function greenwichSiderealTime(date: Date): number {
  const jd = julianDate(date);
  const t = (jd - 2_451_545.0) / 36_525;
  const deg =
    280.46061837 +
    360.98564736629 * (jd - 2_451_545) +
    0.000387933 * t * t -
    (t * t * t) / 38_710_000;
  return wrap360(deg) / 15; // hours
}

/**
 * Convert star RA/Dec to local Altitude/Azimuth.
 *
 * Azimuth is measured from True North, clockwise (0°=N, 90°=E, 180°=S, 270°=W).
 * Altitude is degrees above (+) or below (−) the geometric horizon.
 */
export function starAltitudeAzimuth(
  star: StarRecord,
  date: Date,
  latitude: number,
  longitude: number,
): SkyPoint {
  const lst = wrap360((greenwichSiderealTime(date) + longitude / 15) * 15);
  const hourAngle = wrap180(lst - star.ra * 15) * DEG;
  const dec = star.dec * DEG;
  const lat = latitude * DEG;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const altitude = Math.asin(sinAlt) / DEG;

  const azimuth = wrap360(
    (Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
    ) /
      DEG) +
      180,
  );

  return { altitude, azimuth };
}

// ─── Rotation Matrix ──────────────────────────────────────────────────────────

/**
 * JavaScript equivalent of Android's SensorManager.getRotationMatrix().
 *
 * Computes R from raw accelerometer and magnetometer readings.
 * Returns null when the sensor data is degenerate (mag parallel to gravity,
 * or near-zero magnitude).
 */
export function getRotationMatrix(
  accel: { x: number; y: number; z: number },
  mag: { x: number; y: number; z: number },
): RotationMatrix | null {
  const { x: Ax, y: Ay, z: Az } = accel;
  const { x: Ex, y: Ey, z: Ez } = mag;

  // H = mag × accel  →  East direction in device frame
  let Hx = Ey * Az - Ez * Ay;
  let Hy = Ez * Ax - Ex * Az;
  let Hz = Ex * Ay - Ey * Ax;
  const normH = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz);
  if (normH < 0.1) return null; // degenerate: field parallel to gravity
  const invH = 1 / normH;
  Hx *= invH;
  Hy *= invH;
  Hz *= invH;

  const normA = Math.sqrt(Ax * Ax + Ay * Ay + Az * Az);
  if (normA < 0.1) return null;
  const invA = 1 / normA;
  const ax = Ax * invA,
    ay = Ay * invA,
    az = Az * invA;

  // M = accel_normalised × H  →  North direction in device frame
  const Mx = ay * Hz - az * Hy;
  const My = az * Hx - ax * Hz;
  const Mz = ax * Hy - ay * Hx;

  // Row-major storage: rows are [East, North, Up] expressed in device frame
  return [Hx, Hy, Hz, Mx, My, Mz, ax, ay, az];
}

/**
 * Equivalent of SensorManager.remapCoordinateSystem(R, AXIS_X, AXIS_Z, outR).
 *
 * Remaps the raw rotation matrix from "phone lying flat = pitch 0" to
 * "phone held upright facing horizon = pitch 0" — i.e., the correct reference
 * for a back-facing camera in portrait mode.
 *
 * Derivation: applies a −90° rotation around the device X axis to R.
 * In row-major column terms:
 *   New col 0 = old col 0   (East unchanged)
 *   New col 1 = old col 2   (old Z-col becomes new Y-col)
 *   New col 2 = −old col 1  (negated old Y-col becomes new Z-col)
 *
 * Which in row-major form becomes:
 *   New row i = [ R[i*3+0],  R[i*3+2], −R[i*3+1] ]
 */
export function remapForCamera(R: RotationMatrix): RotationMatrix {
  return [
    R[0],  R[2], -R[1],
    R[3],  R[5], -R[4],
    R[6],  R[8], -R[7],
  ];
}

/**
 * Extract orientation angles from the REMAPPED rotation matrix.
 *
 * Returns { heading, cameraElevation } in degrees where:
 *   heading          = compass bearing of camera forward (0=N, 90=E …)
 *   cameraElevation  = camera elevation above horizon (+90 = zenith)
 *
 * Using R = remapForCamera output:
 *   Camera forward in world ENU = R * (0,0,−1) = −(col 2 of R) = (−R[2], −R[5], −R[8])
 *   heading          = atan2(−R[2], −R[5])  (E and N components of forward)
 *   cameraElevation  = asin(−R[8])           (U component of forward)
 *
 * Note: cameraElevation = −pitch in Android's getOrientation convention.
 */
export function getCameraOrientation(R: RotationMatrix): {
  heading: number;
  cameraElevation: number;
} {
  // Camera forward ENU = (−R[2], −R[5], −R[8])
  const heading = wrap360(Math.atan2(-R[2], -R[5]) / DEG);
  const cameraElevation = Math.asin(-R[8]) / DEG;
  return { heading, cameraElevation };
}

// ─── Web Fallback ─────────────────────────────────────────────────────────────

/**
 * Build a rotation matrix from explicit camera direction (for web/demo mode
 * where sensors are unavailable).
 *
 * cameraAzimuthDeg  – where the camera looks, measured from North clockwise
 * cameraElevationDeg – camera elevation above horizon (+90 = zenith)
 *
 * Derives the three camera basis vectors in ENU and assembles the row-major
 * Android-convention rotation matrix.
 */
export function buildRotationMatrixFromCamera(
  cameraAzimuthDeg: number,
  cameraElevationDeg: number,
): RotationMatrix {
  const az = cameraAzimuthDeg * DEG;
  const el = cameraElevationDeg * DEG;
  const cosEl = Math.cos(el),
    sinEl = Math.sin(el);
  const cosAz = Math.cos(az),
    sinAz = Math.sin(az);

  // Camera forward direction in ENU
  const fE = sinAz * cosEl,
    fN = cosAz * cosEl,
    fU = sinEl;

  // Camera right: cross(fwd, worldUp=(0,0,1)) normalised
  const rE = cosAz,
    rN = -sinAz,
    rU = 0;

  // Camera up: cross(right, fwd)
  const uE = rN * fU - rU * fN; // = -sinAz * sinEl
  const uN = rU * fE - rE * fU; // = -cosAz * sinEl
  const uU = rE * fN - rN * fE; //  = cosAz² * cosEl + sinAz² * cosEl = cosEl

  // Row-major R: rows = [H, M, A] = world axes in device frame.
  // Columns = device axes in world frame: col0=right, col1=up, col2=−fwd
  // So R[row_i] = (col0[i], col1[i], col2[i]) = (r[i], u[i], −f[i])
  return [
    rE,  uE, -fE,
    rN,  uN, -fN,
    rU,  uU, -fU,
  ];
}

// ─── Projection ───────────────────────────────────────────────────────────────

/**
 * Project all catalog stars into screen coordinates.
 *
 * Full 3D pipeline per star:
 *   1. Alt/Az from RA/Dec, observer, time
 *   2. ENU unit vector: E = cos(alt)·sin(az), N = cos(alt)·cos(az), U = sin(alt)
 *   3. Device/camera frame:  v_cam = R^T · v_ENU
 *        v_cam.x = R[0]·E + R[3]·N + R[6]·U
 *        v_cam.y = R[1]·E + R[4]·N + R[7]·U
 *        v_cam.z = R[2]·E + R[5]·N + R[8]·U
 *   4. Visibility:  dot((0,0,−1), v_cam) > 0  →  v_cam.z < 0
 *   5. Perspective: screenX = cx/(−cz)·f  ,  screenY = height/2 − cy/(−cz)·f
 *
 * @param R   The REMAPPED rotation matrix (output of remapForCamera).
 *            On web/demo, pass buildRotationMatrixFromCamera().
 */
export function projectStars(
  date: Date,
  latitude: number,
  longitude: number,
  R: RotationMatrix,
  width: number,
  height: number,
): ProjectedStar[] {
  // Horizontal FOV ≈ 72°; derive focal length in pixels
  const hFovRad = 72 * DEG;
  const focalLen = width / 2 / Math.tan(hFovRad / 2);

  // Unpack columns of R for the R^T multiply
  // col j of R  (row-major 3×3) = [R[j], R[j+3], R[j+6]]
  // v_cam.j = R_col_j · v_ENU
  const r0 = R[0], r3 = R[3], r6 = R[6]; // col 0
  const r1 = R[1], r4 = R[4], r7 = R[7]; // col 1
  const r2 = R[2], r5 = R[5], r8 = R[8]; // col 2

  const results: ProjectedStar[] = [];

  for (const star of STAR_CATALOG) {
    const { altitude, azimuth } = starAltitudeAzimuth(
      star,
      date,
      latitude,
      longitude,
    );

    // Quick cull: star is more than 5° below the geometric horizon → skip
    if (altitude < -5) continue;

    // ── Step 2: Alt/Az → ENU unit vector ──────────────────────────────────
    const altRad = altitude * DEG;
    const azRad = azimuth * DEG;
    const cosAlt = Math.cos(altRad);
    const E = cosAlt * Math.sin(azRad); // East component
    const N = cosAlt * Math.cos(azRad); // North component
    const U = Math.sin(altRad);          // Up component

    // ── Step 3: ENU → device/camera frame  (v_cam = R^T · v_ENU) ─────────
    const cx = r0 * E + r3 * N + r6 * U;
    const cy = r1 * E + r4 * N + r7 * U;
    const cz = r2 * E + r5 * N + r8 * U;

    // ── Step 4: Visibility check ──────────────────────────────────────────
    // Camera forward = (0,0,−1)  in device frame (OpenGL convention)
    // dot((0,0,−1), v_cam) > 0  ↔  −cz > 0  ↔  cz < 0
    if (cz >= 0) continue;

    // ── Step 5: Perspective projection ───────────────────────────────────
    const invNegCz = 1 / (-cz);
    const screenX = width / 2 + cx * invNegCz * focalLen;
    // Screen Y increases downward; camera Y is "up"
    const screenY = height / 2 - cy * invNegCz * focalLen;

    // Clip to viewport with padding
    if (
      screenX < -50 ||
      screenX > width + 50 ||
      screenY < -50 ||
      screenY > height + 50
    )
      continue;

    const size = Math.max(2.4, Math.min(7.2, 7.2 - star.magnitude * 1.45));
    results.push({ ...star, altitude, azimuth, x: screenX, y: screenY, size });
  }

  return results
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 22);
}

// ─── Star Catalog ─────────────────────────────────────────────────────────────

export const STAR_CATALOG: StarRecord[] = [
  { id: 'sirius',    name: 'Sirius',    ra:  6.7525, dec: -16.7161, magnitude: -1.46, distance: '8.6 ly',  constellation: 'Canis Major',      temperature: '9,940 K',  spectralType: 'A1V',      radius: '1.71 R☉',  description: 'The brightest star in the night sky — a hot blue-white binary known as the Dog Star.' },
  { id: 'canopus',   name: 'Canopus',   ra:  6.3992, dec: -52.6957, magnitude: -0.74, distance: '310 ly',  constellation: 'Carina',            temperature: '7,350 K',  spectralType: 'A9II',     radius: '71.4 R☉',  description: 'A brilliant supergiant that has guided spacecraft through deep space.' },
  { id: 'arcturus',  name: 'Arcturus',  ra: 14.261,  dec:  19.1825, magnitude: -0.05, distance: '36.7 ly', constellation: 'Boötes',            temperature: '4,286 K',  spectralType: 'K1.5III',  radius: '25.4 R☉',  description: 'Brightest star in the northern celestial hemisphere — a warm orange giant.' },
  { id: 'vega',      name: 'Vega',      ra: 18.6156, dec:  38.7837, magnitude:  0.03, distance: '25.0 ly', constellation: 'Lyra',              temperature: '9,602 K',  spectralType: 'A0V',      radius: '2.36 R☉',  description: 'Anchor of the Summer Triangle; one of the most studied stars in astronomy.' },
  { id: 'capella',   name: 'Capella',   ra:  5.2782, dec:  45.998,  magnitude:  0.08, distance: '42.9 ly', constellation: 'Auriga',            temperature: '4,970 K',  spectralType: 'G8III',    radius: '12.2 R☉',  description: 'A bright system of four stars that gleams like a golden lantern.' },
  { id: 'rigel',     name: 'Rigel',     ra:  5.2423, dec:  -8.2016, magnitude:  0.13, distance: '860 ly',  constellation: 'Orion',             temperature: '12,100 K', spectralType: 'B8Ia',     radius: '74.1 R☉',  description: 'A blue supergiant marking Orion\'s lower foot — one of the most luminous stars known.' },
  { id: 'procyon',   name: 'Procyon',   ra:  7.655,  dec:   5.225,  magnitude:  0.38, distance: '11.5 ly', constellation: 'Canis Minor',       temperature: '6,530 K',  spectralType: 'F5IV',     radius: '2.05 R☉',  description: 'A nearby binary whose name means "before the dog." It rises before Sirius.' },
  { id: 'betelgeuse',name: 'Betelgeuse',ra:  5.9195, dec:   7.4071, magnitude:  0.42, distance: '640 ly',  constellation: 'Orion',             temperature: '3,500 K',  spectralType: 'M1–M2Ia',  radius: '764 R☉',   description: 'A pulsating red supergiant at Orion\'s shoulder, large enough to engulf Jupiter\'s orbit.' },
  { id: 'achernar',  name: 'Achernar',  ra:  1.6286, dec: -57.2368, magnitude:  0.46, distance: '139 ly',  constellation: 'Eridanus',          temperature: '14,900 K', spectralType: 'B6Vep',    radius: '7.3 R☉',   description: 'A rapidly spinning blue star so oblate it bulges noticeably at its equator.' },
  { id: 'hadar',     name: 'Hadar',     ra: 14.0637, dec: -60.373,  magnitude:  0.61, distance: '390 ly',  constellation: 'Centaurus',         temperature: '25,000 K', spectralType: 'B1III',    radius: '8.6 R☉',   description: 'A hot blue triple system — one of the closest bright stars to the Southern Cross.' },
  { id: 'altair',    name: 'Altair',    ra: 19.8464, dec:   8.8683, magnitude:  0.77, distance: '16.7 ly', constellation: 'Aquila',            temperature: '7,680 K',  spectralType: 'A7V',      radius: '1.63 R☉',  description: 'A rapidly spinning star at the southern point of the Summer Triangle.' },
  { id: 'acrux',     name: 'Acrux',     ra: 12.4433, dec: -63.0991, magnitude:  0.76, distance: '320 ly',  constellation: 'Crux',              temperature: '28,000 K', spectralType: 'B0.5IV',   radius: '8.1 R☉',   description: 'The brightest star in the Southern Cross — a hot blue multiple system.' },
  { id: 'aldebaran', name: 'Aldebaran', ra:  4.5987, dec:  16.5093, magnitude:  0.85, distance: '65.2 ly', constellation: 'Taurus',            temperature: '3,910 K',  spectralType: 'K5III',    radius: '44.2 R☉',  description: 'The fiery eye of Taurus, an orange giant near the Hyades cluster.' },
  { id: 'spica',     name: 'Spica',     ra: 13.4199, dec: -11.1614, magnitude:  0.98, distance: '250 ly',  constellation: 'Virgo',             temperature: '22,400 K', spectralType: 'B1III–IV', radius: '7.4 R☉',   description: 'A hot blue-white binary marking the ear of wheat held by Virgo.' },
  { id: 'antares',   name: 'Antares',   ra: 16.4901, dec: -26.4319, magnitude:  1.09, distance: '550 ly',  constellation: 'Scorpius',          temperature: '3,400 K',  spectralType: 'M1.5Iab',  radius: '680 R☉',   description: 'The "rival of Mars" — a massive red supergiant heart of the Scorpion.' },
  { id: 'pollux',    name: 'Pollux',    ra:  7.7553, dec:  28.0262, magnitude:  1.14, distance: '34.0 ly', constellation: 'Gemini',            temperature: '4,865 K',  spectralType: 'K0III',    radius: '8.8 R☉',   description: 'An orange giant and the brighter of Gemini\'s twin stars.' },
  { id: 'fomalhaut', name: 'Fomalhaut', ra: 22.9608, dec: -29.6222, magnitude:  1.16, distance: '25.1 ly', constellation: 'Piscis Austrinus',  temperature: '8,590 K',  spectralType: 'A3V',      radius: '1.84 R☉',  description: 'A solitary bright star surrounded by a young dusty debris disk.' },
  { id: 'mimosa',    name: 'Mimosa',    ra: 12.7953, dec: -59.6888, magnitude:  1.25, distance: '280 ly',  constellation: 'Crux',              temperature: '27,000 K', spectralType: 'B0.5IV',   radius: '8.4 R☉',   description: 'Blue-white star forming the eastern arm of the Southern Cross.' },
  { id: 'deneb',     name: 'Deneb',     ra: 20.6905, dec:  45.2803, magnitude:  1.25, distance: '2,600 ly',constellation: 'Cygnus',            temperature: '8,525 K',  spectralType: 'A2Ia',     radius: '203 R☉',   description: 'A blue-white supergiant at the tail of the Swan — farthest vertex of the Summer Triangle.' },
  { id: 'regulus',   name: 'Regulus',   ra: 10.1395, dec:  11.9672, magnitude:  1.35, distance: '79.3 ly', constellation: 'Leo',               temperature: '12,460 K', spectralType: 'B7V',      radius: '3.09 R☉',  description: 'The heart of Leo — a fast-spinning blue star with an orbiting companion system.' },
  { id: 'castor',    name: 'Castor',    ra:  7.5767, dec:  31.8883, magnitude:  1.58, distance: '51.6 ly', constellation: 'Gemini',            temperature: '10,286 K', spectralType: 'A1V',      radius: '2.3 R☉',   description: 'A fascinating sextuple star system forming one of Gemini\'s twins.' },
  { id: 'bellatrix', name: 'Bellatrix', ra:  5.4189, dec:   6.3497, magnitude:  1.64, distance: '250 ly',  constellation: 'Orion',             temperature: '21,500 K', spectralType: 'B2III',    radius: '5.75 R☉',  description: 'The Amazon Star — a hot blue giant at Orion\'s right shoulder.' },
  { id: 'alnilam',   name: 'Alnilam',   ra:  5.6036, dec:  -1.2019, magnitude:  1.69, distance: '2,000 ly',constellation: 'Orion',             temperature: '27,000 K', spectralType: 'B0Ia',     radius: '32.4 R☉',  description: 'Central and most luminous star of Orion\'s Belt.' },
  { id: 'polaris',   name: 'Polaris',   ra:  2.5303, dec:  89.2641, magnitude:  1.98, distance: '433 ly',  constellation: 'Ursa Minor',        temperature: '6,015 K',  spectralType: 'F7Ib',     radius: '37.5 R☉',  description: 'The North Star — almost precisely on Earth\'s north rotation axis.' },
  { id: 'kochab',    name: 'Kochab',    ra: 14.8451, dec:  74.1555, magnitude:  2.08, distance: '130.9 ly',constellation: 'Ursa Minor',        temperature: '4,030 K',  spectralType: 'K4III',    radius: '42.1 R☉',  description: 'The guardian of the Little Bear — second-brightest in Ursa Minor.' },
  { id: 'alpheratz', name: 'Alpheratz', ra:  0.1398, dec:  29.0904, magnitude:  2.06, distance: '97 ly',   constellation: 'Andromeda',         temperature: '13,800 K', spectralType: 'B8IV',     radius: '2.6 R☉',   description: 'A blue-white star shared by the constellations Andromeda and Pegasus.' },
  { id: 'alnitak',   name: 'Alnitak',   ra:  5.6793, dec:  -1.9426, magnitude:  1.74, distance: '1,260 ly',constellation: 'Orion',             temperature: '31,000 K', spectralType: 'O9.5Ib',   radius: '28.5 R☉',  description: 'The easternmost star of Orion\'s Belt, adjacent to the Horsehead Nebula.' },
  { id: 'mintaka',   name: 'Mintaka',   ra:  5.5334, dec:   0.2992, magnitude:  2.23, distance: '1,200 ly',constellation: 'Orion',             temperature: '29,500 K', spectralType: 'O9.5II',   radius: '16.5 R☉',  description: 'The westernmost star of Orion\'s Belt — actually a quadruple system.' },
  { id: 'denebola',  name: 'Denebola',  ra: 11.8177, dec:  14.572,  magnitude:  2.14, distance: '36.2 ly', constellation: 'Leo',               temperature: '8,500 K',  spectralType: 'A3V',      radius: '1.73 R☉',  description: 'The tail of Leo — a nearby star with a dusty debris disk.' },
  { id: 'markab',    name: 'Markab',    ra: 23.0793, dec:  15.2053, magnitude:  2.49, distance: '133 ly',  constellation: 'Pegasus',           temperature: '9,660 K',  spectralType: 'A0IV',     radius: '4.7 R☉',   description: 'One of the four stars outlining the Great Square of Pegasus.' },
  { id: 'scheat',    name: 'Scheat',    ra: 23.0629, dec:  28.0828, magnitude:  2.44, distance: '196 ly',  constellation: 'Pegasus',           temperature: '3,700 K',  spectralType: 'M2.5II–III',radius: '95 R☉',  description: 'A red giant at the northwest corner of Pegasus\'s Great Square.' },
];
