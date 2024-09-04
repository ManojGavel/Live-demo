// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useMemo, createContext, useContext } from 'react';
import { FluentThemeProvider, lightTheme, darkTheme } from '@azure/communication-react';
import { Theme, PartialTheme } from '@fluentui/react';
import { getThemeFromLocalStorage, saveThemeToLocalStorage } from '../utils/localStorage';

/**
 * A theme with an associated name.
 */


/**
 * Collection of NamedThemes
 */


const defaultThemes = {
  Light: {
    name: 'Light',
    theme: lightTheme
  },
  Dark: {
    name: 'Dark',
    theme: darkTheme
  }
};

/**
 * Interface for React useContext hook containing the FluentTheme and a setter to switch themes
 */


const defaultTheme = defaultThemes.Dark;

/**
 * React useContext for FluentTheme state of SwitchableFluentThemeProvider
 */
const SwitchableFluentThemeContext = createContext({
  currentTheme: defaultTheme,
  currentRtl: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  setCurrentTheme: (theme) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  setCurrentRtl: (rtl) => {},
  themeStore: defaultThemes
});

/**
 * Props for SwitchableFluentThemeProvider
 */


/**
 * @description Provider wrapped around FluentThemeProvider that stores themes in local storage
 * to be switched via useContext hook.
 * @param props - SwitchableFluentThemeProviderProps
 * @remarks This makes use of the browser's local storage if available
 */
export const SwitchableFluentThemeProvider = (props) => {
  const { children, scopeId } = props;
  const [themeStore, setThemeCollection] = useState(props.themes ?? defaultThemes);

  const themeFromStorage = getThemeFromLocalStorage(scopeId);
  const initialTheme = themeStore[themeFromStorage || defaultTheme.name] ?? defaultTheme;
  const [currentTheme, _setCurrentTheme] = useState(initialTheme);
  const [currentRtl, _setCurrentRtl] = useState(false);

  const state = useMemo(
    () => ({
      currentTheme,
      setCurrentTheme: (namedTheme) => {
        _setCurrentTheme(namedTheme);
        // If this is a new theme, add to the theme store
        if (!themeStore[namedTheme.name]) {
          setThemeCollection({ ...themeStore, namedTheme });
        }

        // Save current selection to local storage. Note the theme itself
        // is not saved to local storage, only the name.
        if (typeof Storage !== 'undefined') {
          saveThemeToLocalStorage(namedTheme.name, scopeId);
        }
      },
      currentRtl,
      setCurrentRtl: (rtl) => {
        _setCurrentRtl(rtl);
      },
      themeStore
    }),
    [currentTheme, currentRtl, scopeId, themeStore]
  );

  return (
    <SwitchableFluentThemeContext.Provider value={state}>
      <FluentThemeProvider fluentTheme={currentTheme.theme} rtl={currentRtl}>
        {children}
      </FluentThemeProvider>
    </SwitchableFluentThemeContext.Provider>
  );
};

/**
 * React hook for programmatically accessing the switchable fluent theme.
 */
export const useSwitchableFluentTheme = () => useContext(SwitchableFluentThemeContext);
