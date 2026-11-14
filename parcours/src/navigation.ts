import type { GrievanceCategory } from './screens/GrievancesScreen';
import type { MyApplication } from './session';

export type RootStack = {
  Login: undefined;
  Home: undefined;
  Application: { application: MyApplication };
  Appeal: { decisionId: string; program: string };
  Profile: undefined;
  Help: undefined;
  Grievances: undefined;
  Report: { categories: GrievanceCategory[] };
};
