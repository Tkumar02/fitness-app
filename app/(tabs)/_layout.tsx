//_layout.tsx in tabs folder
import { Ionicons } from '@expo/vector-icons'; // Standard Expo icons
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: '#007AFF',
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="Goals" 
        options={{ 
          title: 'Goals', 
          tabBarIcon: ({ color }) => <Ionicons name="trophy" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="AddWorkout" 
        options={{ 
          title: 'Log Workout', 
          tabBarIcon: ({ color }) => <Ionicons name="add-circle" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="ReviewWorkout" 
        options={{ 
          title: 'Stats', 
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="ProgressionCharts" 
        options={{ 
          title: 'Analytics', 
          tabBarIcon: ({ color }) => <Ionicons name="trending-up-outline" size={24} color={color} /> 
        }} 
      />
    </Tabs>
  );
}