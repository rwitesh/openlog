import { isClerkAPIResponseError, useSignIn, useSignUp } from "@clerk/expo";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { posthog } from "@/config/posthog";
import { useProfile } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation/types";
import { ONBOARDING_COMPLETED_KEY, setSetting } from "@/services/db/settings";
import { logDevWarning } from "@/shared/utils";

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

/** Callers must render this only once Clerk has loaded; the signal hooks read the loaded client. */
export function useWelcomeAuth(navigation: Navigation) {
  const { setName } = useProfile();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();

  const [step, setStep] = useState<Step>("choose");
  const [intent, setIntent] = useState<Intent>("signup");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setNameInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = signUpFetchStatus === "fetching" || signInFetchStatus === "fetching";

  const exitToApp = () => completeOnboarding(navigation);

  const startIntent = (next: Intent) => {
    setIntent(next);
    setErrorMessage(null);
    setStep("email");
  };

  const goBackStep = () => {
    setErrorMessage(null);
    setStep(step === "email" ? "choose" : step === "code" ? "email" : "code");
  };

  const editEmail = () => {
    setErrorMessage(null);
    setStep("email");
  };

  // Clerk returns expected failures as { error } results but throws on
  // transport failures; both surface the same user-facing message.
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (error) {
      const info = errorInfo(error, "Something went wrong. Please try again.");
      logDevWarning("welcome:request", `${info.code}: ${info.message} | ${String(error)}`);
      setErrorMessage(info.message);
    }
  };

  const submitEmail = () =>
    run(async () => {
      const emailAddress = email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(emailAddress) || busy) return;
      setErrorMessage(null);

      if (intent === "signup") {
        // Start from a clean attempt so an abandoned one cannot interfere.
        await signUp.reset();
        const { error } = await signUp.create({ emailAddress });
        if (error) {
          const info = errorInfo(error, "Something went wrong. Please try again.");
          logDevWarning(
            "welcome:signupStart",
            `${info.code}: ${info.message} | ${JSON.stringify(error)}`
          );
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
          logDevWarning(
            "welcome:sendCode",
            `${info.code}: ${info.message} | ${JSON.stringify(sendError)}`
          );
          setErrorMessage(info.message);
          return;
        }
      } else {
        await signIn.reset();
        const { error } = await signIn.emailCode.sendCode({ emailAddress });
        if (error) {
          const info = errorInfo(error, "Something went wrong. Please try again.");
          logDevWarning(
            "welcome:loginStart",
            `${info.code}: ${info.message} | ${JSON.stringify(error)}`
          );
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
      if (trimmedCode.length !== 6 || busy) return;
      setErrorMessage(null);

      if (intent === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code: trimmedCode });
        if (error) {
          setErrorMessage(errorInfo(error, "That code didn't work. Try again.").message);
          return;
        }
        if (signUp.status === "complete") {
          // Name already on the account (e.g. resumed sign-up), so skip asking.
          const existingName = signUp.firstName?.trim();
          if (existingName) {
            await signUp.finalize();
            setName(existingName);
            posthog?.capture("onboarding_completed");
            exitToApp();
            return;
          }
          setStep("name");
          return;
        }
        logDevWarning("welcome:signupStatus", signUp.status);
        return;
      }

      const { error } = await signIn.emailCode.verifyCode({ code: trimmedCode });
      if (error) {
        setErrorMessage(errorInfo(error, "That code didn't work. Try again.").message);
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        posthog?.capture("login_completed");
        exitToApp();
        return;
      }
      logDevWarning("welcome:signinStatus", signIn.status);
    });

  const submitName = () =>
    run(async () => {
      const firstName = name.trim();
      if (!firstName || busy) return;
      setErrorMessage(null);

      const { error } = await signUp.update({ firstName });
      if (error) {
        setErrorMessage(errorInfo(error, "Could not save your name. Please try again.").message);
        return;
      }
      await signUp.finalize();
      setName(firstName);
      posthog?.capture("onboarding_completed");
      exitToApp();
    });

  const resendCode = () =>
    run(async () => {
      if (busy) return;
      if (intent === "signup") await signUp.verifications.sendEmailCode();
      else await signIn.emailCode.sendCode();
    });

  const canContinue =
    !busy &&
    (step === "email"
      ? EMAIL_PATTERN.test(email.trim())
      : step === "code"
        ? code.trim().length === 6
        : name.trim().length > 0);

  const submitStep = step === "email" ? submitEmail : step === "code" ? submitCode : submitName;

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
