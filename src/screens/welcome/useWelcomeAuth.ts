import { isClerkAPIResponseError, useAuth, useSignIn, useSignUp, useUser } from "@clerk/expo";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { posthog } from "@/config/posthog";
import { retryClerkLoad, useClerkStatus } from "@/modules/auth";
import { useProfile } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation/types";
import { ONBOARDING_COMPLETED_KEY, setSetting } from "@/services/db/settings";
import { logDevWarning, reportError } from "@/shared/utils";

type Navigation = NativeStackNavigationProp<RootStackParamList, "Welcome">;

type Intent = "signup" | "login";
export type Step = "choose" | "email" | "code" | "name";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function useWelcomeAuth(navigation: Navigation) {
  const { setName } = useProfile();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerkStatus = useClerkStatus();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();

  const [step, setStep] = useState<Step>("choose");
  const [intent, setIntent] = useState<Intent>("signup");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // A tap that arrives before Clerk finishes loading is held; Clerk load is
  // retried on failure, and the submit re-runs from fresh state once ready.
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const retriedLoad = useRef(false);
  const submitRef = useRef<() => void>(() => {});

  const submitting = signUpFetchStatus === "fetching" || signInFetchStatus === "fetching";
  const busy = pendingSubmit || submitting;

  // Recover from a failed initial load while the user reads the choose screen.
  useEffect(() => {
    retryClerkLoad();
  }, []);

  const exitToApp = useCallback(() => completeOnboarding(navigation), [navigation]);

  // Signed-in users never need the flow: a named account leaves straight away,
  // a nameless one (interrupted sign-up) resumes at the name step.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || step !== "choose" || user === undefined) return;
    const fullName = [user?.firstName, user?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ");
    if (fullName) exitToApp();
    else setStep("name");
  }, [isLoaded, isSignedIn, step, user, exitToApp]);

  const startIntent = (next: Intent) => {
    setIntent(next);
    setErrorMessage(null);
    setStep("email");
  };

  const goBackStep = () => {
    setErrorMessage(null);
    // By the name step the account exists and is signed in, so Back leaves the flow.
    if (step === "name") {
      exitToApp();
      return;
    }
    setStep(step === "email" ? "choose" : "email");
  };

  const editEmail = () => {
    setErrorMessage(null);
    setStep("email");
  };

  // Clerk returns expected failures as { error } results but throws on
  // transport failures; both surface the same user-facing message.
  const execute = useCallback(async (action: { fn: () => Promise<void>; fallback?: string }) => {
    try {
      await action.fn();
    } catch (error) {
      const info = errorInfo(error, action.fallback ?? "Something went wrong. Please try again.");
      report("request", error, info);
      setErrorMessage(info.message);
    }
  }, []);

  const run = (fn: () => Promise<void>, fallback?: string) => {
    if (!isLoaded) {
      retryClerkLoad();
      retriedLoad.current = false;
      setPendingSubmit(true);
      return;
    }
    void execute({ fn, fallback });
  };

  // Drain the held submit once Clerk loads; retry a failed load once, then
  // tell the user the network is the problem.
  useEffect(() => {
    if (!pendingSubmit) return;
    if (isLoaded) {
      setPendingSubmit(false);
      submitRef.current();
      return;
    }
    if (clerkStatus === "error") {
      if (retriedLoad.current) {
        setPendingSubmit(false);
        reportError("onboarding_error", { where: "clerkLoad" });
        setErrorMessage("Network problem. Check your internet connection and try again.");
        return;
      }
      retriedLoad.current = true;
      retryClerkLoad();
    }
  }, [isLoaded, clerkStatus, pendingSubmit]);

  const finalize = async (target: Intent) => {
    const { error } = target === "signup" ? await signUp.finalize() : await signIn.finalize();
    if (!error) return true;
    const info = errorInfo(error, "Something went wrong. Please try again.");
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
          const info = errorInfo(error, "Something went wrong. Please try again.");
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
          const info = errorInfo(error, "Something went wrong. Please try again.");
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
      const trimmedCode = code.trim();
      if (trimmedCode.length !== 6 || submitting) return;
      setErrorMessage(null);

      if (intent === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code: trimmedCode });
        if (error) {
          const info = errorInfo(error, "That code didn't work. Try again.");
          report("verifyCode", error, info);
          setErrorMessage(info.message);
          return;
        }
        if (signUp.status !== "complete") {
          report("signupStatus", signUp.status, {
            code: signUp.status ?? null,
            message: "Something went wrong. Please try again.",
          });
          setErrorMessage("Something went wrong. Please try again.");
          return;
        }
        // A completed sign-up is consumed, so the name goes on the user profile
        // after the session exists, not back onto the sign-up attempt.
        if (!(await finalize("signup"))) return;
        const existingName = [signUp.firstName, signUp.lastName]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(" ");
        if (existingName) {
          setName(existingName);
          posthog?.capture("onboarding_completed");
          exitToApp();
          return;
        }
        setStep("name");
        return;
      }

      const { error } = await signIn.emailCode.verifyCode({ code: trimmedCode });
      if (error) {
        const info = errorInfo(error, "That code didn't work. Try again.");
        report("verifyCode", error, info);
        setErrorMessage(info.message);
        return;
      }
      if (signIn.status === "complete") {
        if (!(await finalize("login"))) return;
        posthog?.capture("login_completed");
        exitToApp();
        return;
      }
      report("signinStatus", signIn.status, {
        code: signIn.status ?? null,
        message: "Something went wrong. Please try again.",
      });
      setErrorMessage("Something went wrong. Please try again.");
    });

  const submitName = () =>
    run(async () => {
      const fullName = name.trim().replace(/\s+/g, " ");
      if (!fullName || submitting) return;
      setErrorMessage(null);
      // Set at sign-up finalization; a missing user here means the session did not activate.
      if (!user) {
        report("nameNoSession", null, { code: null, message: "No active session after sign-up." });
        setErrorMessage("Something went wrong. Please try again.");
        return;
      }
      // First word is the first name; the rest is the last name.
      const [firstName, ...rest] = fullName.split(" ");
      const lastName = rest.join(" ");
      await user.update({ firstName, ...(lastName ? { lastName } : {}) });
      setName(fullName);
      posthog?.capture("onboarding_completed");
      exitToApp();
    }, "Could not save your name. Please try again.");

  const resendCode = () =>
    run(async () => {
      if (submitting || !isLoaded) return;
      if (intent === "signup") await signUp.verifications.sendEmailCode();
      else await signIn.emailCode.sendCode();
    });

  const canContinue =
    !busy &&
    (step === "email"
      ? EMAIL_PATTERN.test(email.trim())
      : step === "code"
        ? code.trim().length === 6
        : name.trim().length > 0 && user != null);

  const submitStep = step === "email" ? submitEmail : step === "code" ? submitCode : submitName;
  // The drain effect re-runs the latest submit; closures would capture the
  // pre-load (null) signUp/signIn objects.
  submitRef.current = submitStep;

  return {
    step,
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
    startIntent,
    submitEmail,
    submitCode,
    submitName,
    submitStep,
    resendCode,
    goBackStep,
    editEmail,
    exitToApp,
  };
}
