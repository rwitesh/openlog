import {
  getClerkInstance,
  isClerkAPIResponseError,
  useAuth,
  useSignIn,
  useSignUp,
  useUser,
} from "@clerk/expo";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { posthog } from "@/config/posthog";
import { useProfile } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation/types";
import { ONBOARDING_COMPLETED_KEY, setSetting } from "@/services/db/settings";
import { AUTH_REQUIRED_FOR_ONBOARDING } from "@/shared/constants";
import { IS_EXPO_GO, logDevWarning, reportError } from "@/shared/utils";

type Navigation = NativeStackNavigationProp<RootStackParamList, "Welcome">;

type Intent = "signup" | "login";
export type Step = "showcase" | "choose" | "email" | "code" | "name";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = "Something went wrong. Please try again.";

/** Re-runs Clerk initialization after a failed load. Skipped in Expo Go, whose
    runtime lacks window.location pieces of the native clerk bundle touch
    unconditionally on retry (Cannot read property 'href' of undefined). */
function connectClerk(): Promise<void> | void {
  if (IS_EXPO_GO) return;
  const clerk = getClerkInstance();
  if (clerk.status !== "error") return;
  return clerk.load().catch((error) => logDevWarning("welcome:clerkRetry", error));
}

function errorInfo(error: unknown, fallback: string): { code: string | null; message: string } {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0];
    if (error.status === 429 || first?.code === "too_many_requests") {
      return {
        code: "too_many_requests",
        message: "Too many attempts. Wait a minute, then try again.",
      };
    }
    // API error text describes internals; only the code drives user-facing copy.
    return { code: first?.code ?? null, message: fallback };
  }
  const clerkError = error as { code?: string; message?: string } | null;
  if (
    clerkError?.code === "clerk_offline" ||
    (clerkError?.message &&
      /network|failed to fetch|timeout|aborted|offline/i.test(clerkError.message))
  ) {
    return {
      code: clerkError?.code ?? null,
      message: "Network problem. Check your internet connection and try again.",
    };
  }
  return { code: clerkError?.code ?? null, message: fallback };
}

/** Marks onboarding done and leaves the Welcome screen, with or without an account. */
export function completeOnboarding(navigation: Navigation) {
  setSetting(ONBOARDING_COMPLETED_KEY, "1").catch((error) =>
    logDevWarning("welcome:markDone", error)
  );
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.replace("Timeline");
}

/** User-facing copy stays generic; the raw detail goes to reportError. */
function report(where: string, raw: unknown, info: { code: string | null; message: string }) {
  reportError("onboarding_error", {
    where,
    code: info.code,
    message: info.message,
    detail: raw instanceof Error ? raw.message : String(raw),
  });
}

function displayNameOf(
  user?: { firstName: string | null; lastName: string | null } | null
): string | null {
  return (
    [user?.firstName, user?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null
  );
}

// localMode: beta local name onboarding; authOnly (Profile login) always uses Clerk.
export function useWelcomeAuth(navigation: Navigation, authOnly = false) {
  const localMode = !AUTH_REQUIRED_FOR_ONBOARDING && !authOnly;
  const { setName } = useProfile();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();

  const [step, setStep] = useState<Step>(authOnly ? "choose" : "showcase");
  const [intent, setIntent] = useState<Intent>("signup");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Spins the buttons while a Clerk-init retry runs; action requests are covered
  // by fetchStatus below.
  const [connecting, setConnecting] = useState(false);

  // One routing decision per mounted screen keeps Clerk state churn from
  // double-navigating; resume points themselves stay derived from Clerk.
  const routedRef = useRef(false);
  // Synchronous sibling of `submitting`: state flips commit too late to stop
  // two taps landing in the same frame.
  const inFlightRef = useRef(false);

  const submitting = signUpFetchStatus === "fetching" || signInFetchStatus === "fetching";
  const busy = submitting || connecting;

  // Recover silently when the initial load already failed while the user reads.
  useEffect(() => {
    connectClerk();
  }, []);

  const exitToApp = useCallback(() => completeOnboarding(navigation), [navigation]);

  // Clerk owns the routing decision: named sessions leave immediately, nameless
  // ones resume at the name step — whether interrupted mid-signup or created
  // outside the app, the missing piece is always just the name.
  useEffect(() => {
    if (routedRef.current || !isLoaded || !isSignedIn || !user) return;
    routedRef.current = true;
    if (displayNameOf(user)) exitToApp();
    else setStep("name");
  }, [isLoaded, isSignedIn, user, exitToApp]);

  const finishShowcase = () => {
    setErrorMessage(null);
    setStep(localMode ? "name" : "choose");
  };

  const startIntent = (next: Intent) => {
    setIntent(next);
    setErrorMessage(null);
    setStep("email");
  };

  // email -> code -> name mirrors the natural flow backwards; nothing submitted
  // before the code step invalidates the attempt.
  const goBackStep = () => {
    setErrorMessage(null);
    if (!authOnly && (step === "name" || step === "choose")) {
      setStep("showcase");
      return;
    }
    setStep(step === "name" ? "code" : step === "code" ? "email" : "choose");
  };

  // Clerk returns expected failures as { error } results but throws on
  // transport failures; both surface the same user-facing message.
  const execute = useCallback(async (action: { fn: () => Promise<void>; fallback?: string }) => {
    try {
      await action.fn();
    } catch (error) {
      const info = errorInfo(error, action.fallback ?? GENERIC_ERROR);
      report("request", error, info);
      setErrorMessage(info.message);
    }
  }, []);

  // Submits before Clerk connects never send anything; spin the retry and ask
  // for another tap once connected instead of queueing UI state behind it.
  const run = (fn: () => Promise<void>, fallback?: string) => {
    if (!isLoaded) {
      setErrorMessage(
        IS_EXPO_GO
          ? "Sign-in cannot connect in Expo Go. Please run a development build."
          : "Still connecting. Please try again in a moment."
      );
      if (IS_EXPO_GO || busy) return;
      setConnecting(true);
      void Promise.resolve(connectClerk()).finally(() => setConnecting(false));
      return;
    }
    if (inFlightRef.current || submitting) return;
    inFlightRef.current = true;
    void execute({ fn, fallback }).finally(() => {
      inFlightRef.current = false;
    });
  };

  const finalize = async (target: Intent) => {
    const { error } = target === "signup" ? await signUp.finalize() : await signIn.finalize();
    if (!error) return true;
    const info = errorInfo(error, GENERIC_ERROR);
    report("finalize", error, info);
    setErrorMessage(info.message);
    return false;
  };

  const submitEmail = () =>
    run(async () => {
      const emailAddress = email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(emailAddress) || submitting) return;
      setErrorMessage(null);

      if (intent === "signup") {
        // Start from a clean attempt so an abandoned one cannot interfere.
        await signUp.reset();
        const { error } = await signUp.create({ emailAddress });
        if (error) {
          const info = errorInfo(error, GENERIC_ERROR);
          report("signupStart", error, info);
          setErrorMessage(
            info.code === "form_identifier_exists"
              ? "This email already has an account. Go back and choose Log in."
              : info.code === "form_param_format_invalid"
                ? "That doesn't look like a valid email address."
                : info.message
          );
          return;
        }
        const { error: sendError } = await signUp.verifications.sendEmailCode();
        if (sendError) {
          const info = errorInfo(sendError, "Could not send the code. Please try again.");
          report("sendCode", sendError, info);
          setErrorMessage(info.message);
          return;
        }
      } else {
        await signIn.reset();
        const { error } = await signIn.emailCode.sendCode({ emailAddress });
        if (error) {
          const info = errorInfo(error, GENERIC_ERROR);
          report("loginStart", error, info);
          setErrorMessage(
            info.code === "form_identifier_not_found"
              ? "No account found for this email. Go back and choose Create new account."
              : info.code === "form_param_format_invalid"
                ? "That doesn't look like a valid email address."
                : info.message
          );
          return;
        }
      }

      setCode("");
      setStep("code");
    });

  const submitCode = () =>
    run(async () => {
      const verificationCode = code.trim();
      if (verificationCode.length !== 6 || submitting) return;
      setErrorMessage(null);

      if (intent === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
        if (error) {
          const info = errorInfo(error, "That code didn't work. Try again.");
          report("verifyCode", error, info);
          setErrorMessage(info.message);
          return;
        }
        if (signUp.status !== "complete") {
          report("signupStatus", signUp.status, {
            code: signUp.status ?? null,
            message: GENERIC_ERROR,
          });
          setErrorMessage(GENERIC_ERROR);
          return;
        }
        if (!(await finalize("signup"))) return;
        // Authentication and onboarding are separate states: the session is
        // alive from here, only the name is left to collect.
        setStep("name");
        return;
      }

      const { error } = await signIn.emailCode.verifyCode({ code: verificationCode });
      if (error) {
        const info = errorInfo(error, "That code didn't work. Try again.");
        report("verifyCode", error, info);
        setErrorMessage(info.message);
        return;
      }
      if (signIn.status !== "complete") {
        report("signinStatus", signIn.status, {
          code: signIn.status ?? null,
          message: GENERIC_ERROR,
        });
        setErrorMessage(GENERIC_ERROR);
        return;
      }
      if (!(await finalize("login"))) return;
      // An account created outside the app may lack the name entirely.
      if (!displayNameOf(user)) {
        setStep("name");
        return;
      }
      posthog?.capture("login_completed");
      exitToApp();
    });

  const submitName = () =>
    run(async () => {
      const fullName = name.trim().replace(/\s+/g, " ");
      if (!fullName || submitting) return;
      setErrorMessage(null);
      // Set during code verification; a missing user means no active session.
      if (!user) {
        report("nameNoSession", null, { code: null, message: "No active session after auth." });
        setErrorMessage(GENERIC_ERROR);
        return;
      }
      // First word is the first name; the rest is the last name.
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");
      await user.update({ firstName, ...(lastName ? { lastName } : {}) });
      setName(fullName);
      if (intent === "signup") posthog?.capture("onboarding_completed");
      else posthog?.capture("login_completed");
      exitToApp();
    }, "Could not save your name. Please try again.");

  const resendCode = () =>
    run(async () => {
      if (submitting) return;
      if (intent === "signup") await signUp.verifications.sendEmailCode();
      else await signIn.emailCode.sendCode();
    }, "Could not send a new code. Please try again.");

  // No Clerk dependency; a signed-in nameless session gets mirrored best-effort.
  const saveLocalName = () => {
    const fullName = name.trim().replace(/\s+/g, " ");
    if (!fullName || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      setErrorMessage(null);
      setName(fullName);
      posthog?.capture("onboarding_completed");
      if (isLoaded && user && !displayNameOf(user)) {
        const [firstName, ...rest] = fullName.split(" ");
        const lastName = rest.join(" ");
        user
          .update({ firstName, ...(lastName ? { lastName } : {}) })
          .catch((error) => logDevWarning("welcome:localNameSync", error));
      }
      exitToApp();
    } finally {
      inFlightRef.current = false;
    }
  };

  const canContinue =
    !busy &&
    (step === "showcase"
      ? true
      : step === "email"
        ? EMAIL_PATTERN.test(email.trim())
        : step === "code"
          ? code.trim().length === 6
          : name.trim().length > 0);

  const submitStep =
    step === "showcase"
      ? finishShowcase
      : step === "email"
        ? submitEmail
        : step === "code"
          ? submitCode
          : localMode
            ? saveLocalName
            : submitName;

  const canGoBack = step !== "showcase" && !(authOnly && step === "choose");

  return {
    localMode,
    step,
    setStep,
    intent,
    email,
    setEmail,
    code,
    setCode,
    name,
    setName: setNameInput,
    errorMessage,
    busy,
    canContinue,
    canGoBack,
    startIntent,
    submitStep,
    finishShowcase,
    resendCode,
    goBackStep,
    exitToApp,
  };
}
