import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProjectedStar } from '@/lib/astronomy';

type Props = {
  star: ProjectedStar;
  selected: boolean;
  nightMode: boolean;
  onPress: () => void;
};

export function StarLabel({ star, selected, nightMode, onPress }: Props) {
  return (
    <Pressable
      testID={`star-${star.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { left: star.x - 34, top: star.y - 18, opacity: pressed ? 0.72 : 1 },
      ]}
    >
      <View style={[styles.dot, { width: star.size + 8, height: star.size + 8, borderRadius: star.size + 8, backgroundColor: selected ? '#69B7FF' : nightMode ? '#EC5365' : '#FFFFFF' }]}>
        <Ionicons name="star" size={star.size + 1} color={selected ? '#06101F' : nightMode ? '#3C0610' : '#2C486A'} />
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: selected ? '#69B7FF' : nightMode ? '#EC5365' : '#FFFFFF' }]}>{star.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', width: 84, alignItems: 'center', gap: 4 },
  dot: { alignItems: 'center', justifyContent: 'center', shadowColor: '#FFFFFF', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.15, textShadowColor: '#050B17', textShadowRadius: 4 },
});
