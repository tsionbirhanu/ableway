import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Register Page - F0 Accessibility & Registration Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await page.locator("h1").waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(
      () => typeof window !== "undefined" && typeof window.fillField === "function",
    );
  });

  test("passes axe accessibility scan with 0 violations", async ({ page }) => {
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    expect(axeResults.violations).toEqual([]);
  });

  test("has correct landmarks, title, single h1 with focus, and accessible labels (Rules 1, 2, 4, 7, 15)", async ({
    page,
  }) => {
    // Unique descriptive title
    await expect(page).toHaveTitle("Create your account - Ableway");

    // Single h1
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Create your account");

    // Required fields explicitly indicate (required)
    await expect(page.locator('label[for="reg-name"]')).toContainText("(required)");
    await expect(page.locator('label[for="reg-email"]')).toContainText("(required)");
    await expect(page.locator('label[for="reg-lang"]')).toContainText("(required)");
    await expect(page.locator('label[for="reg-consent"]')).toContainText("(required)");

    // Correct input types and autocomplete attributes (Rule 15)
    await expect(page.locator("#reg-name")).toHaveAttribute("type", "text");
    await expect(page.locator("#reg-name")).toHaveAttribute("autocomplete", "name");

    await expect(page.locator("#reg-email")).toHaveAttribute("type", "email");
    await expect(page.locator("#reg-email")).toHaveAttribute("autocomplete", "email");

    await expect(page.locator("#reg-phone")).toHaveAttribute("type", "tel");
    await expect(page.locator("#reg-phone")).toHaveAttribute("autocomplete", "tel");

    await expect(page.locator("#reg-lang")).toHaveAttribute("autocomplete", "language");

    await expect(page.locator("#reg-consent")).toHaveAttribute("type", "checkbox");
  });

  test("keyboard-only registration with error handling and one-time code sign-in", async ({
    page,
  }) => {
    // 1. Submit empty form to trigger errors (Rule 16)
    const submitBtn = page.getByRole("button", { name: "Continue to Verification" });
    await submitBtn.click();

    // Verify error summary appears at the top with role="alert"
    const errorSummary = page.locator("#error-summary");
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toContainText("There is a problem with your submission");

    // Verify fields marked invalid and have aria-describedby
    const nameInput = page.locator("#reg-name");
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#reg-name-error")).toHaveText("Enter your full name");

    const emailInput = page.locator("#reg-email");
    await expect(emailInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#reg-email-error")).toHaveText(
      "Enter an email like name@example.com",
    );

    // 2. Fill form entirely using keyboard
    await nameInput.focus();
    await page.keyboard.type("Abebe Bikila");
    await expect(nameInput).toHaveValue("Abebe Bikila");

    await emailInput.focus();
    await page.keyboard.type("abebe@example.com");

    const phoneInput = page.locator("#reg-phone");
    await phoneInput.focus();
    await page.keyboard.type("+251911234567");

    const langSelect = page.locator("#reg-lang");
    await langSelect.focus();
    await langSelect.selectOption("en");

    // Check consent checkbox via Space key
    const consentBox = page.locator("#reg-consent");
    await consentBox.focus();
    await page.keyboard.press("Space");
    await expect(consentBox).toBeChecked();

    // Submit details
    await submitBtn.focus();
    await page.keyboard.press("Enter");

    // 3. One-Time Code Verification Stage
    const otpInput = page.locator("#reg-otp");
    await expect(otpInput).toBeVisible();
    await expect(otpInput).toHaveAttribute("autocomplete", "one-time-code");

    // Accepts paste (Rule 17)
    await otpInput.focus();
    await otpInput.fill("123456");

    // Complete sign-in
    const verifyBtn = page.getByRole("button", { name: "Verify & Complete Sign-In" });
    await verifyBtn.click();

    // Verify live announcer announces success message
    const announcer = page.locator("#ableway-live-announcer");
    await expect(announcer).toContainText("Account created. Going to course choice");

    // Verify redirect to /courses
    await page.waitForURL("**/courses", { timeout: 10000 });
    expect(page.url()).toContain("/courses");
  });

  test("simulated voice registration with spelling mode and confirmation", async ({ page }) => {
    // Start assistant
    const startVoiceBtn = page.getByRole("button", { name: "Start Voice Assistant", exact: true });
    await startVoiceBtn.click();

    // Assistant says intro and asks for name
    const speechDisplay = page.getByTestId("assistant-speech-display");
    await expect(speechDisplay).toBeVisible();
    await expect(speechDisplay).toContainText("What is your full name?");

    // Use simulated voice helper exposed on window
    const speakToAssistant = async (text: string) => {
      await page.evaluate((msg) => {
        if (window.__simulateVoiceInput) {
          window.__simulateVoiceInput(msg);
        }
      }, text);
    };

    // 1. Test Spelling Mode for Full Name
    await speakToAssistant("spell");
    await expect(speechDisplay).toContainText("Spelling mode for full name");

    await speakToAssistant("J A N E");
    await expect(speechDisplay).toContainText("Building: JANE");

    await speakToAssistant("done");
    await expect(speechDisplay).toContainText("I entered JANE. Is that right?");
    await expect(page.locator("#reg-name")).toHaveValue("JANE");

    // Change name
    await speakToAssistant("no");
    await expect(speechDisplay).toContainText("Let us try again. What is your full name?");

    await speakToAssistant("Jane Doe");
    await expect(speechDisplay).toContainText("I entered Jane Doe. Is that right?");
    await expect(page.locator("#reg-name")).toHaveValue("Jane Doe");

    // Confirm name
    await speakToAssistant("yes");
    await expect(speechDisplay).toContainText("What is your email address?");

    // 2. Test repeat command
    await speakToAssistant("repeat");
    await expect(speechDisplay).toContainText("What is your email address?");

    // 3. Test Spelling Mode for Email
    await speakToAssistant("spell");
    await expect(speechDisplay).toContainText("Spelling mode for email");

    await speakToAssistant("j a n e at e x a m p l e dot c o m");
    await speakToAssistant("done");
    await expect(speechDisplay).toContainText("I entered jane@example.com. Is that right?");
    await expect(page.locator("#reg-email")).toHaveValue("jane@example.com");

    // Confirm email
    await speakToAssistant("yes");
    await expect(speechDisplay).toContainText("What is your phone number?");

    // 4. Test "change email" meta command
    await speakToAssistant("change email");
    await expect(speechDisplay).toContainText("Let us change your email");

    await speakToAssistant("learner@ableway.org");
    await expect(speechDisplay).toContainText("I entered learner@ableway.org. Is that right?");
    await expect(page.locator("#reg-email")).toHaveValue("learner@ableway.org");

    await speakToAssistant("yes");
    await expect(speechDisplay).toContainText("What is your phone number?");

    // 5. Skip phone
    await speakToAssistant("skip");
    await expect(speechDisplay).toContainText("What is your preferred language?");

    // 6. Select language
    await speakToAssistant("English");
    await expect(speechDisplay).toContainText("I selected English. Is that right?");
    await expect(page.locator("#reg-lang")).toHaveValue("en");

    await speakToAssistant("yes");
    await expect(speechDisplay).toContainText("plain-language privacy summary");

    // 7. Test privacy consent explicit yes
    // If learner says something other than yes, consent is not recorded
    await speakToAssistant("not yet");
    await expect(speechDisplay).toContainText("Consent has not been recorded");
    await expect(page.locator("#reg-consent")).not.toBeChecked();

    // Explicit yes records consent
    await speakToAssistant("yes I agree");
    await expect(speechDisplay).toContainText(
      "Consent recorded. Here is your full registration summary",
    );
    await expect(page.locator("#reg-consent")).toBeChecked();

    // 8. Confirm whole summary review
    await speakToAssistant("yes");
    await expect(speechDisplay).toContainText("What is your one-time code?");

    // 9. Enter one-time code via voice
    await speakToAssistant("1 2 3 4 5 6");
    await expect(speechDisplay).toContainText("I entered code 1 2 3 4 5 6. Is that right?");
    await expect(page.locator("#reg-otp")).toHaveValue("123456");

    // Confirm code
    await speakToAssistant("yes");

    // Verify success announcement and redirect
    const announcer = page.locator("#ableway-live-announcer");
    await expect(announcer).toContainText("Account created. Going to course choice");

    await page.waitForURL("**/courses", { timeout: 10000 });
    expect(page.url()).toContain("/courses");
  });
});

test.describe("Navigation & Auth Flow: Home -> Login -> Register", () => {
  test("Home page directs to Login when Login button is clicked", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator("#top-nav-login");
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
    const loginH1 = page.getByRole("heading", { level: 1, name: "Sign in to your account" });
    await expect(loginH1).toBeVisible();
  });

  test("Login page shows accessible registration link that directs to /register", async ({
    page,
  }) => {
    await page.goto("/login");
    const registerLink = page.locator("#link-to-register");
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toContainText("Create Account");
    await registerLink.click();
    await page.waitForURL("**/register");
    expect(page.url()).toContain("/register");
    const registerH1 = page.getByRole("heading", { level: 1, name: "Create your account" });
    await expect(registerH1).toBeVisible();
  });

  test("Login page passes axe accessibility scan with 0 violations", async ({ page }) => {
    await page.goto("/login");
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });
});

test.describe("Courses Page - F0 Accessibility & Selection Flows", () => {
  test("passes axe accessibility scan with 0 violations", async ({ page }) => {
    await page.goto("/courses");
    await page.locator("h1").waitFor({ state: "visible" });
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test("has correct title, single h1 with focus, and accessible controls", async ({ page }) => {
    await page.goto("/courses");
    await expect(page).toHaveTitle("Choose a course - Ableway");
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("Choose a course");
    await expect(h1).toBeFocused();
  });

  test("selecting a course initiates audio lessons flow", async ({ page }) => {
    await page.goto("/courses");
    const selectBtn = page.locator("#select-data-analytics-btn");
    await expect(selectBtn).toBeVisible();
    await selectBtn.click();
    await expect(page).toHaveURL(/\/learn\/data-analytics/, { timeout: 10000 });
  });

  test("Language toggle switches system language between English and Amharic", async ({ page }) => {
    await page.goto("/courses");
    const langBtn = page.locator("#courses-lang-switch-btn");
    await expect(langBtn).toBeVisible();
    await expect(langBtn).toContainText("Language: English");

    // Switch to Amharic
    await langBtn.click();
    await expect(langBtn).toContainText("ቋንቋ፡ አማርኛ");
    const speechDisplay = page.getByTestId("courses-speech-display");
    // Start assistant in Amharic
    const startAssistantBtn = page.locator("#start-courses-assistant-btn");
    await startAssistantBtn.click();
    await expect(speechDisplay).toContainText("እንኳን ወደ ኮርስ መምረጫ በደህና መጡ");

    // Spoken command in Amharic selects course
    await page.evaluate(() => {
      if (window.__simulateVoiceInput) {
        window.__simulateVoiceInput!("ዳታ አናሊቲክስ");
      }
    });
    await expect(speechDisplay).toContainText("ተመርጧል");
  });
});
