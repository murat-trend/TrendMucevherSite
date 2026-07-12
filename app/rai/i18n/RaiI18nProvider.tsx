"use client";

import { createContext, useContext } from "react";
import { getRaiDict, RAI_DEFAULT_LOCALE, type RaiDict, type RaiLocale } from ".";

type RaiI18nValue = {
  locale: RaiLocale;
  dict: RaiDict;
};

const RaiI18nContext = createContext<RaiI18nValue>({
  locale: RAI_DEFAULT_LOCALE,
  dict: getRaiDict(RAI_DEFAULT_LOCALE),
});

export function RaiI18nProvider({
  locale,
  children,
}: {
  locale: RaiLocale;
  children: React.ReactNode;
}) {
  return (
    <RaiI18nContext.Provider value={{ locale, dict: getRaiDict(locale) }}>
      {children}
    </RaiI18nContext.Provider>
  );
}

export function useRai(): RaiI18nValue {
  return useContext(RaiI18nContext);
}
