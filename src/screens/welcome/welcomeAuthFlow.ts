export type WelcomeAuthIntent = "signup" | "login";
export type WelcomeAuthStep = "showcase" | "choose" | "email" | "code" | "name";

interface WelcomeAuthUser {
  firstName: string | null;
  lastName: string | null;
}

export function initialWelcomeStep(authOnly: boolean): WelcomeAuthStep {
  return authOnly ? "choose" : "showcase";
}

export function stepAfterShowcase(localMode: boolean): WelcomeAuthStep {
  return localMode ? "name" : "choose";
}

export function stepAfterBack(step: WelcomeAuthStep, authOnly: boolean): WelcomeAuthStep {
  if (!authOnly && (step === "name" || step === "choose")) return "showcase";
  if (step === "name") return "code";
  if (step === "code") return "email";
  return "choose";
}

export function isAuthenticatedUserNamed(user?: WelcomeAuthUser | null): boolean {
  return [user?.firstName, user?.lastName].some((part) => Boolean(part?.trim()));
}

export function authenticatedWelcomeStep(user: WelcomeAuthUser): "complete" | "name" {
  return isAuthenticatedUserNamed(user) ? "complete" : "name";
}
