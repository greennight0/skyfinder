import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SkyContextValue = {
  favorites: string[];
  nightMode: boolean;
  toggleFavorite: (id: string) => void;
  setNightMode: (value: boolean) => void;
};

const SkyContext = createContext<SkyContextValue | null>(null);

export function SkyProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem('skyfinder-favorites'),
      AsyncStorage.getItem('skyfinder-night-mode'),
    ]).then(([storedFavorites, storedNightMode]) => {
      if (storedFavorites) setFavorites(JSON.parse(storedFavorites) as string[]);
      if (storedNightMode) setNightMode(storedNightMode === 'true');
    });
  }, []);

  const value = useMemo<SkyContextValue>(() => ({
    favorites,
    nightMode,
    toggleFavorite: (id) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFavorites((current) => {
        const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
        void AsyncStorage.setItem('skyfinder-favorites', JSON.stringify(next));
        return next;
      });
    },
    setNightMode: (value) => {
      setNightMode(value);
      void AsyncStorage.setItem('skyfinder-night-mode', String(value));
    },
  }), [favorites, nightMode]);

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSky() {
  const value = useContext(SkyContext);
  if (!value) throw new Error('useSky must be used within SkyProvider');
  return value;
}
