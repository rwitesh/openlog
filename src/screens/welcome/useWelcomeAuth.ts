import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { analytics } from "@/config/analytics";
import { useProfile } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation/types";
import { ONBOARDING_COMPLETED_KEY, setSetting } from "@/services/db/settings";
import { logDevWarning } from "@/shared/utils";

type Navigation = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export type Step = "showcase" | "name";

/** Marks onboarding done and leaves the Welcome screen. */
export function completeOnboarding(navigation: Navigation) {
  setSetting(ONBOARDING_COMPLETED_KEY, "1").catch((error) =>
    logDevWarning("welcome:markDone", error)
  );
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.replace("Timeline");
}

export function useWelcomeAuth(navigation: Navigation) {
  const { setName } = useProfile();
  const [step, setStep] = useState<Step>("showcase");
  const [name, setNameInput] = useState("");

  const finishShowcase = () => setStep("name");

  const goBackStep = () => setStep("showcase");

  const saveName = () => {
    const fullName = name.trim().replace(/\s+/g, " ");
    if (!fullName) return;
    setName(fullName);
    analytics.capture("onboarding_completed");
    completeOnboarding(navigation);
  };

  return {
    step,
    name,
    setName: setNameInput,
    canContinue: name.trim().length > 0,
    canGoBack: step === "name",
    finishShowcase,
    goBackStep,
    submitStep: step === "showcase" ? finishShowcase : saveName,
    exitToApp: () => completeOnboarding(navigation),
  };
}
