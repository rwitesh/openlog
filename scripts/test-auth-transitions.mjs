import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticatedWelcomeStep,
  initialWelcomeStep,
  stepAfterBack,
  stepAfterShowcase,
} from "../src/screens/welcome/welcomeAuthFlow.ts";

test("welcome starts at the appropriate entry point", () => {
  assert.equal(initialWelcomeStep(false), "showcase");
  assert.equal(initialWelcomeStep(true), "choose");
});

test("showcase completion routes local and account onboarding separately", () => {
  assert.equal(stepAfterShowcase(true), "name");
  assert.equal(stepAfterShowcase(false), "choose");
});

test("back navigation preserves the onboarding flow boundary", () => {
  assert.equal(stepAfterBack("code", false), "email");
  assert.equal(stepAfterBack("name", false), "showcase");
  assert.equal(stepAfterBack("name", true), "code");
  assert.equal(stepAfterBack("choose", true), "choose");
});

test("authenticated users either complete onboarding or resume name collection", () => {
  assert.equal(authenticatedWelcomeStep({ firstName: "Ada", lastName: "Lovelace" }), "complete");
  assert.equal(authenticatedWelcomeStep({ firstName: " ", lastName: null }), "name");
  assert.equal(authenticatedWelcomeStep({ firstName: null, lastName: "Ng" }), "complete");
});
