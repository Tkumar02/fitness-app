import React from 'react';
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
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="Goals" 
        options={{ 
          title: 'Goals', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="trophy" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="AddWorkout" 
        options={{ 
          title: 'Log Workout', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="add-circle" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="ReviewWorkout" 
        options={{ 
          title: 'Progress', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="trending-up-outline" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="TemplateList" 
        options={{ 
          title: 'Regimes', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="bag-handle-outline" size={24} color={color} /> 
        }} 
      />

      <Tabs.Screen 
        name="CommunityFeed" // This must match your filename (e.g., community.tsx)
        options={{ 
          href: null, // This hides it from the bottom bar
        }} 
      />

      <Tabs.Screen 
        name="CreateRegime" // This must match your filename (e.g., community.tsx)
        options={{ 
          href: null, // This hides it from the bottom bar
        }} 
      />

      <Tabs.Screen 
        name="ActiveRegime" // This must match your filename (e.g., community.tsx)
        options={{ 
          title: 'Active regime', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="body-outline" size={24} color={color} /> 
        }} 
      />

      <Tabs.Screen 
        name="ProgressionCharts" 
        options={{ 
          title: 'Analytics', 
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="stats-chart" size={24} color={color} /> 
        }} 
      />

    </Tabs>

  );
}