declare module '@react-navigation/native' {
  import { ReactNode } from 'react';

  export const DefaultTheme: {
    dark: boolean;
    colors: Record<string, string>;
  };

  export function NavigationContainer(props: { children: ReactNode; theme?: unknown }): JSX.Element;
}
