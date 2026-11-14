import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStack } from './src/navigation';
import AppealScreen from './src/screens/AppealScreen';
import ApplicationScreen from './src/screens/ApplicationScreen';
import GrievancesScreen from './src/screens/GrievancesScreen';
import HelpScreen from './src/screens/HelpScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';
import { SessionProvider, useSession } from './src/session';
import { C } from './src/theme';

const Stack = createNativeStackNavigator<RootStack>();

function Routes() {
  const { ready, profile } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryDeep }}>
        <ActivityIndicator color={C.white} size="large" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      {profile ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Application" component={ApplicationScreen} />
          <Stack.Screen name="Appeal" component={AppealScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Grievances" component={GrievancesScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NavigationContainer>
          <Routes />
        </NavigationContainer>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
