import { StyleSheet, Text, View, useColorScheme } from 'react-native';

export default function ExploreScreen() {
  const isDark = useColorScheme() === 'dark';
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
      <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
        Workout History
      </Text>
      <Text style={{ color: isDark ? '#aaa' : '#666' }}>
        Coming soon: Your previous logs will appear here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});