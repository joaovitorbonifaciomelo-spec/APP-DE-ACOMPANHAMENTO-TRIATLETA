import { Tabs } from 'expo-router';
import React from 'react';

import { TabBar } from '@/components/tab-bar';
import { colors } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="forca" />
      <Tabs.Screen name="cardio" />
      <Tabs.Screen name="provas" />
    </Tabs>
  );
}
