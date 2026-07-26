import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { ProjectedStar, STAR_CATALOG, projectStars, StarRecord } from '@/lib/astronomy';
import { StarLabel } from '@/components/StarLabel';
import { SkyProvider, useSky } from '@/context/SkyContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_LOCATION = { latitude: 37.7749, longitude: -122.4194 };

function SkyFinderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favorites, nightMode, toggleFavorite, setNightMode } = useSky();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [heading, setHeading] = useState(180);
  const [pitch, setPitch] = useState(18);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const [viewport, setViewport] = useState({ width: SCREEN_WIDTH, height: 650 });
  const [selectedStar, setSelectedStar] = useState<ProjectedStar | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const sheetY = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!cameraPermission?.granted) void requestCameraPermission();
    if (!locationPermission?.granted) void requestLocationPermission();
  }, [cameraPermission?.granted, locationPermission?.granted, requestCameraPermission, requestLocationPermission]);

  useEffect(() => {
    if (Platform.OS === 'web' || !locationPermission?.granted) return;
    let mounted = true;
    void Location.getLastKnownPositionAsync().then((value) => { if (mounted && value) setLocation(value); });
    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((value) => { if (mounted) setLocation(value); });
    return () => { mounted = false; };
  }, [locationPermission?.granted]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let acceleration: { x: number; y: number; z: number } | null = null;
    let magnetic: { x: number; y: number; z: number } | null = null;
    let alive = true;
    void Promise.all([Accelerometer.isAvailableAsync(), Magnetometer.isAvailableAsync()]).then(([accelerometerReady, magnetometerReady]) => {
      if (alive) setSensorAvailable(accelerometerReady && magnetometerReady);
    });
    Accelerometer.setUpdateInterval(80);
    Magnetometer.setUpdateInterval(80);
    const accelerationSubscription = Accelerometer.addListener((value) => {
      acceleration = value;
      if (magnetic) updateOrientation();
    });
    const magneticSubscription = Magnetometer.addListener((value) => {
      magnetic = value;
      if (acceleration) updateOrientation();
    });
    function updateOrientation() {
      if (!acceleration || !magnetic) return;
      const nextHeading = (Math.atan2(magnetic.y, magnetic.x) * 180) / Math.PI + 90;
      const magnitude = Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2);
      const nextPitch = (Math.atan2(-acceleration.z, Math.sqrt(acceleration.x ** 2 + acceleration.y ** 2)) * 180) / Math.PI;
      if (Number.isFinite(nextHeading) && Number.isFinite(nextPitch) && magnitude > 0.3) {
        setHeading((current) => current * 0.82 + (((nextHeading + 360) % 360) * 0.18));
        setPitch((current) => current * 0.82 + nextPitch * 0.18);
      }
    }
    return () => {
      alive = false;
      accelerationSubscription.remove();
      magneticSubscription.remove();
    };
  }, []);

  const observer = location?.coords ?? PREVIEW_LOCATION;
  const projectedStars = useMemo(() => projectStars(new Date(), observer.latitude, observer.longitude, heading, pitch, viewport.width, viewport.height), [heading, observer.latitude, observer.longitude, pitch, viewport.height, viewport.width]);
  const filteredSearch = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return STAR_CATALOG.slice(0, 8);
    return STAR_CATALOG.filter((star) => `${star.name} ${star.constellation}`.toLowerCase().includes(normalized)).slice(0, 8);
  }, [query]);

  const openStar = useCallback((star: ProjectedStar) => {
    void Haptics.selectionAsync();
    setSelectedStar(star);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
  }, [sheetY]);

  const closeStar = useCallback(() => {
    Animated.timing(sheetY, { toValue: 500, duration: 220, useNativeDriver: true }).start(() => setSelectedStar(null));
  }, [sheetY]);

  const selectSearchStar = (star: StarRecord) => {
    setSearchOpen(false);
    setQuery('');
    const projected = projectedStars.find((item) => item.id === star.id);
    if (projected) openStar(projected);
    else {
      setSelectedStar({ ...star, altitude: 0, azimuth: heading, x: viewport.width / 2, y: viewport.height / 2, size: 5 });
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
    }
  };

  const cameraReady = Platform.OS === 'web' || cameraPermission?.granted;
  const permissionText = !cameraPermission?.granted ? 'Camera access is needed to see the sky through your lens.' : !locationPermission?.granted ? 'Location access keeps star positions accurate for your horizon.' : '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={styles.cameraLayer} onLayout={(event) => setViewport({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
        {cameraReady && Platform.OS !== 'web' ? <CameraView style={StyleSheet.absoluteFill} facing="back" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlayStrong }]} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: nightMode ? colors.redNight : colors.overlay, opacity: nightMode ? 0.34 : 0.46 }]} />
        <View style={styles.starsLayer} pointerEvents="box-none">
          {projectedStars.map((star) => <StarLabel key={star.id} star={star} selected={selectedStar?.id === star.id} nightMode={nightMode} onPress={() => openStar(star)} />)}
        </View>
        <View style={styles.crosshair} pointerEvents="none">
          <View style={[styles.crosshairLine, { backgroundColor: colors.starDim }]} />
          <View style={[styles.crosshairLineVertical, { backgroundColor: colors.starDim }]} />
          <View style={[styles.crosshairRing, { borderColor: colors.starDim }]} />
        </View>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={[styles.brand, { color: colors.foreground }]}>SKYFINDER</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{location ? 'LIVE SKY • CALIBRATED' : 'PREVIEW SKY • LOCATION NEEDED'}</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable testID="search-stars" onPress={() => setSearchOpen(true)} style={[styles.iconButton, { backgroundColor: colors.overlay }]}>
            <Ionicons name="search" size={19} color={colors.foreground} />
          </Pressable>
          <Pressable testID="open-settings" onPress={() => setShowSettings(true)} style={[styles.iconButton, { backgroundColor: colors.overlay }]}>
            <Ionicons name="options-outline" size={19} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.statusPill, { top: insets.top + 78, backgroundColor: colors.overlay }]}>
        <View style={[styles.statusDot, { backgroundColor: locationPermission?.granted ? colors.success : colors.primary }]} />
        <Text style={[styles.statusText, { color: colors.starDim }]}>{location ? `${location.coords.latitude.toFixed(2)}°, ${location.coords.longitude.toFixed(2)}°` : 'Enable location for precision'}</Text>
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>•</Text>
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{Math.round(heading)}° N</Text>
      </View>

      {!!permissionText && (
        <View style={[styles.permissionCard, { top: insets.top + 124, backgroundColor: colors.overlay, borderColor: colors.border }]}>
          <Ionicons name={!cameraPermission?.granted ? 'camera-outline' : 'navigate-outline'} size={18} color={colors.primary} />
          <Text style={[styles.permissionCopy, { color: colors.starDim }]}>{permissionText}</Text>
          <Pressable testID="request-permissions" onPress={() => !cameraPermission?.granted ? requestCameraPermission() : requestLocationPermission()} style={[styles.permissionButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.permissionButtonText, { color: colors.primaryForeground }]}>ALLOW</Text>
          </Pressable>
        </View>
      )}

      {!sensorAvailable && Platform.OS !== 'web' && (
        <View style={[styles.sensorBanner, { backgroundColor: colors.destructive }]}>
          <Ionicons name="warning-outline" size={16} color={colors.destructiveForeground} />
          <Text style={[styles.sensorText, { color: colors.destructiveForeground }]}>Motion sensors unavailable — orientation is fixed</Text>
        </View>
      )}

      <View style={[styles.bottomHud, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.bottomMeta}>
          <View>
            <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>VISIBLE TONIGHT</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]}>{projectedStars.length} <Text style={[styles.metaUnit, { color: colors.mutedForeground }]}>bright stars</Text></Text>
          </View>
          <View style={styles.headingReadout}>
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
            <Text style={[styles.headingText, { color: colors.foreground }]}>{heading.toFixed(0)}°</Text>
          </View>
        </View>
        <View style={[styles.tip, { borderTopColor: colors.border }]}>
          <Ionicons name="hand-left-outline" size={15} color={colors.mutedForeground} />
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>Move your phone to explore • Tap a star to learn more</Text>
        </View>
      </View>

      <Modal visible={searchOpen} animationType="fade" transparent onRequestClose={() => setSearchOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlayStrong }]}>
          <View style={[styles.searchPanel, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
            <View style={styles.searchHeader}>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>Find a star</Text>
              <Pressable testID="close-search" onPress={() => setSearchOpen(false)} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.foreground} /></Pressable>
            </View>
            <View style={[styles.searchInputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.mutedForeground} />
              <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search by name or constellation" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.searchResults}>
              {filteredSearch.map((star) => (
                <Pressable key={star.id} testID={`search-${star.id}`} onPress={() => selectSearchStar(star)} style={({ pressed }) => [styles.resultRow, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                  <View style={[styles.resultStar, { backgroundColor: colors.primary }]}><Ionicons name="star" size={12} color={colors.primaryForeground} /></View>
                  <View style={styles.resultCopy}><Text style={[styles.resultName, { color: colors.foreground }]}>{star.name}</Text><Text style={[styles.resultDetail, { color: colors.mutedForeground }]}>{star.constellation} • mag {star.magnitude.toFixed(2)}</Text></View>
                  {favorites.includes(star.id) && <Ionicons name="heart" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlayStrong }]}>
          <View style={[styles.settingsPanel, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.panelHandle} />
            <View style={styles.settingsHeader}><View><Text style={[styles.panelEyebrow, { color: colors.primary }]}>SKYFINDER</Text><Text style={[styles.panelTitle, { color: colors.foreground }]}>Preferences</Text></View><Pressable testID="close-settings" onPress={() => setShowSettings(false)} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.foreground} /></Pressable></View>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Night mode</Text><Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>Protect dark-adapted vision with a red overlay</Text></View><Pressable testID="toggle-night-mode" onPress={() => setNightMode(!nightMode)} style={[styles.toggle, { backgroundColor: nightMode ? colors.redNight : colors.secondary }]}><View style={[styles.toggleKnob, { backgroundColor: colors.star, transform: [{ translateX: nightMode ? 18 : 2 }] }]} /></Pressable></View>
            <View style={[styles.settingRow, { borderBottomColor: colors.border }]}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Sensor fusion</Text><Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>Accelerometer + magnetometer smoothing</Text></View><Ionicons name={sensorAvailable ? 'checkmark-circle' : 'alert-circle'} size={23} color={sensorAvailable ? colors.success : colors.destructive} /></View>
            <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: colors.foreground }]}>Saved stars</Text><Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>Your offline favorites</Text></View><Text style={[styles.savedCount, { color: colors.primary }]}>{favorites.length}</Text></View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedStar} animationType="none" transparent onRequestClose={closeStar}>
        <Pressable style={styles.sheetBackdrop} onPress={closeStar}>
          <Animated.View style={[styles.starSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, transform: [{ translateY: sheetY }] }]}><Pressable onPress={(event) => event.stopPropagation()} style={styles.sheetContent}><View style={styles.panelHandle} /><View style={styles.sheetHeader}><View style={styles.starTitleRow}><View style={[styles.bigStar, { backgroundColor: nightMode ? colors.redNight : colors.primary }]}><Ionicons name="star" size={19} color={nightMode ? '#3C0610' : colors.primaryForeground} /></View><View><Text style={[styles.panelEyebrow, { color: colors.primary }]}>{selectedStar?.constellation.toUpperCase()}</Text><Text style={[styles.starTitle, { color: colors.foreground }]}>{selectedStar?.name}</Text></View></View><Pressable testID="favorite-star" onPress={() => selectedStar && toggleFavorite(selectedStar.id)} style={[styles.favoriteButton, { backgroundColor: colors.secondary }]}><Ionicons name={selectedStar && favorites.includes(selectedStar.id) ? 'heart' : 'heart-outline'} size={21} color={colors.primary} /></Pressable></View><Text style={[styles.starDescription, { color: colors.starDim }]}>{selectedStar?.description}</Text><View style={styles.statsGrid}>{[['DISTANCE', selectedStar?.distance], ['MAGNITUDE', selectedStar?.magnitude.toFixed(2)], ['TEMP', selectedStar?.temperature], ['SPECTRAL TYPE', selectedStar?.spectralType], ['RADIUS', selectedStar?.radius], ['ALTITUDE', `${selectedStar?.altitude.toFixed(1)}°`]].map(([label, value]) => <View key={label} style={[styles.stat, { backgroundColor: colors.secondary }]}><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text></View>)}</View><Pressable testID="close-star-sheet" onPress={closeStar} style={[styles.doneButton, { backgroundColor: colors.primary }]}><Text style={[styles.doneButtonText, { color: colors.primaryForeground }]}>BACK TO SKY</Text></Pressable></Pressable></Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function Index() {
  return <SkyProvider><SkyFinderScreen /></SkyProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  cameraLayer: { ...StyleSheet.absoluteFillObject },
  starsLayer: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 2.6 },
  subtitle: { marginTop: 4, fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1.2 },
  topActions: { flexDirection: 'row', gap: 9 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statusPill: { position: 'absolute', left: 20, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 0.4 },
  permissionCard: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  permissionCopy: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  permissionButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8 },
  permissionButtonText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.6 },
  sensorBanner: { position: 'absolute', top: 110, left: 20, right: 20, borderRadius: 9, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sensorText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  crosshair: { position: 'absolute', top: '50%', left: '50%', width: 60, height: 60, marginLeft: -30, marginTop: -30, alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
  crosshairLine: { position: 'absolute', width: 60, height: 1 },
  crosshairLineVertical: { position: 'absolute', width: 1, height: 60 },
  crosshairRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  bottomHud: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  bottomMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 15 },
  metaLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.2 },
  metaValue: { marginTop: 3, fontFamily: 'Inter_700Bold', fontSize: 22 },
  metaUnit: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  headingReadout: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headingText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  tip: { paddingTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  searchPanel: { minHeight: '73%', paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  searchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  panelTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: -0.4 },
  panelEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13 },
  searchInput: { flex: 1, height: 46, fontFamily: 'Inter_400Regular', fontSize: 13 },
  searchResults: { paddingTop: 6 },
  resultRow: { minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultStar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  resultCopy: { flex: 1 },
  resultName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  resultDetail: { marginTop: 3, fontFamily: 'Inter_400Regular', fontSize: 11 },
  settingsPanel: { paddingHorizontal: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  panelHandle: { alignSelf: 'center', marginTop: 10, marginBottom: 18, width: 38, height: 4, borderRadius: 2, backgroundColor: '#49617D' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 23 },
  settingRow: { minHeight: 75, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  settingCopy: { flex: 1 },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  settingDetail: { marginTop: 5, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  toggle: { width: 42, height: 25, borderRadius: 13, justifyContent: 'center' },
  toggleKnob: { width: 21, height: 21, borderRadius: 11 },
  savedCount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(1, 6, 15, 0.58)' },
  starSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetContent: { paddingHorizontal: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigStar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  starTitle: { marginTop: 3, fontFamily: 'Inter_700Bold', fontSize: 25 },
  favoriteButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  starDescription: { marginTop: 19, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 19 },
  stat: { width: '31.8%', minHeight: 58, borderRadius: 10, padding: 9 },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 0.7 },
  statValue: { marginTop: 7, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  doneButton: { marginTop: 20, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  doneButtonText: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1 },
});
