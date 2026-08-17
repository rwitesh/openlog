import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setUserName as persistUserName } from "@/services/db/settings";

import { useDebouncedCallback } from "@/shared/hooks/useDebouncedCallback";

interface ProfileContextValue {
  name: string | null;
  setName: (name: string) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  name: null,
  setName: () => {},
});

interface ProfileProviderProps {
  children: ReactNode;
  initialName: string | null;
}

export function ProfileProvider({ children, initialName }: ProfileProviderProps) {
  const [name, setNameState] = useState<string | null>(initialName);

  const debouncedPersist = useDebouncedCallback((next: string) => {
    void persistUserName(next);
  }, 400);

  const setName = useCallback((next: string) => {
    setNameState(next || null);
    debouncedPersist(next);
  }, [debouncedPersist]);

  const value = useMemo(() => ({ name, setName }), [name, setName]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
