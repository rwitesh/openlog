import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { setUserName as persistUserName } from "@/db/settings";

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

  const setName = useCallback((next: string) => {
    const trimmed = next.trim();
    setNameState(trimmed || null);
    void persistUserName(trimmed);
  }, []);

  const value = useMemo(() => ({ name, setName }), [name, setName]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}
