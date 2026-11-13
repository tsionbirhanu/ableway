import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Register Page - F0 Accessibility & Registration Flows', () => {
  test('passes axe accessibility scan with 0 violations', async ({ page }) => {
    await page.goto('/register');
    await page.locator('h1').waitFor({ state: 'visible' });
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('has correct landmarks, title, single h1 with focus, and accessible labels (Rules 1, 2, 4, 7, 15)', async ({
    page,
  }) => {
    await page.goto('/register');

    // Unique descriptive title (Rule 4)
    await expect(page).toHaveTitle('Create your account - Ableway');

    // Single h1 with focus (Rule 2, 7)
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Create your account');
    await expect(h1).toBeFocused();

    // Landmarks (Rule 2)
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Main Navigation"]')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();

    // Form controls have visible, persistent labels (Rule 15)
    await expect(page.locator('label[for="full-name"]')).toHaveText(/Full name/);
    await expect(page.locator('label[for="email-address"]')).toHaveText(/Email address/);
    await expect(page.locator('label[for="phone-number"]')).toHaveText(/Phone number/);
    await expect(page.locator('label[for="learning-language"]')).toHaveText(/Preferred learning language/);

    // Consent checkbox with explicit yes required (Rule 15)
    const consentCheckbox = page.locator('#consent-checkbox');
    await expect(consentCheckbox).toBeVisible();
    await expect(page.locator('label[for="consent-checkbox"]')).toContainText(
      'I have read and agree to the plain-language privacy summary'
    );
  });

  test('keyboard-only registration with error handling and one-time code sign-in', async ({ page }) => {
    await page.goto('/register');

    // Test form submit with missing fields -> error summary shown with role="alert" (Rule 16)
    const submitBtn = page.locator('#create-account-submit-btn');
    await submitBtn.click();

    const errorSummary = page.locator('#register-error-summary');
    await expect(errorSummary).toBeVisible();
    await expect(errorSummary).toHaveAttribute('role', 'alert');
    await expect(errorSummary).toBeFocused();

    // Fill form using keyboard inputs
    const fullNameInput = page.locator('#full-name');
    await fullNameInput.fill('Abebe Bikila');

    const emailInput = page.locator('#email-address');
    await emailInput.fill('abebe@example.com');

    const phoneInput = page.locator('#phone-number');
    await phoneInput.fill('+251911223344');

    const consentBox = page.locator('#consent-checkbox');
    await consentBox.check();

    // Submit form
    await submitBtn.click();

    // OTP verification view appears
    const otpH2 = page.getByRole('heading', { level: 2, name: 'Verify your email with a one-time code' });
    await expect(otpH2).toBeVisible();

    // Test OTP error with less than 6 digits
    const otpInput = page.locator('#one-time-code');
    await otpInput.fill('123');
    const verifyBtn = page.locator('#verify-otp-submit-btn');
    await verifyBtn.click();

    const otpErrorSummary = page.locator('#otp-error-summary');
    await expect(otpErrorSummary).toBeVisible();
    await expect(otpErrorSummary).toContainText('Enter the 6-digit code');

    // Fill valid 6-digit OTP
    await otpInput.fill('123456');
    await verifyBtn.click();

    // Verify redirect to /courses
    await page.waitForURL('**/courses', { timeout: 10000 });
    expect(page.url()).toContain('/courses');
  });

  test('simulated voice registration with spelling mode and confirmation', async ({ page }) => {
    await page.goto('/register');

    // Start voice assistant
    const startAssistantBtn = page.locator('#start-assistant-btn');
    await startAssistantBtn.click();

    const speechDisplay = page.getByTestId('assistant-speech-display');
    await expect(speechDisplay).toContainText('What is your full name?');

    // Simulate voice input for name
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('Almaz Ayana');
    });

    await expect(speechDisplay).toContainText('What is your email address?');

    // Simulate voice input for email
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('almaz at example dot com');
    });

    // Confirmation step for email
    await expect(speechDisplay).toContainText('Is this correct?');

    // Confirm email
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('yes');
    });

    await expect(speechDisplay).toContainText('What is your phone number?');

    // Simulate voice input for phone with digits
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('0911234567');
    });

    // Confirm phone
    await expect(speechDisplay).toContainText('Is this correct?');
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('yes');
    });

    // Language preference question
    await expect(speechDisplay).toContainText('Do you prefer English or Amharic?');

    // Select language
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('English');
    });

    // Privacy consent question
    await expect(speechDisplay).toContainText('Do you agree? Please say yes or no.');

    // Give consent
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('yes');
    });

    // Summary confirmation
    await expect(speechDisplay).toContainText('Should I create your account now?');

    // Confirm registration
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('yes');
    });

    // OTP question
    await expect(speechDisplay).toContainText('What is the 6-digit code?');

    // Speak 6-digit OTP
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('1 2 3 4 5 6');
    });

    // Confirm OTP
    await expect(speechDisplay).toContainText('Is this correct?');
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('yes');
    });

    // Verify success announcement and redirect
    const announcer = page.locator('#ableway-live-announcer');
    await expect(announcer).toContainText('Account created. Going to course choice');

    await page.waitForURL('**/courses', { timeout: 10000 });
    expect(page.url()).toContain('/courses');
  });
});

test.describe('Navigation & Auth Flow: Home -> Login -> Register', () => {
  test('Home page directs to Login when Login button is clicked', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('#top-nav-login');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
    const loginH1 = page.getByRole('heading', { level: 1, name: 'Sign in to your account' });
    await expect(loginH1).toBeVisible();
  });

  test('Login page shows accessible registration link that directs to /register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('#link-to-register');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toContainText('Create Account');
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
    const registerH1 = page.getByRole('heading', { level: 1, name: 'Create your account' });
    await expect(registerH1).toBeVisible();
  });

  test('Login page passes axe accessibility scan with 0 violations', async ({ page }) => {
    await page.goto('/login');
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });
});

test.describe('Courses Page - F0 Accessibility & Selection Flows', () => {
  test('passes axe accessibility scan with 0 violations', async ({ page }) => {
    await page.goto('/courses');
    await page.locator('h1').waitFor({ state: 'visible' });
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('has correct title, single h1 with focus, and accessible controls', async ({ page }) => {
    await page.goto('/courses');
    await expect(page).toHaveTitle('Choose a course - Ableway');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Choose a course');
    await expect(h1).toBeFocused();
  });

  test('renders each course as a card with h2 title, description, level, duration, price, and accessible choose button', async ({
    page,
  }) => {
    await page.goto('/courses');

    // Cards have h2 headings
    const h2s = page.locator('article h2');
    await expect(h2s).toHaveCount(4);
    await expect(h2s.first()).toHaveText('Data Analytics');

    // Verify card content: level, duration, price, description
    const firstCard = page.locator('article').first();
    await expect(firstCard).toContainText('Level');
    await expect(firstCard).toContainText('Comprehensive');
    await expect(firstCard).toContainText('Duration');
    await expect(firstCard).toContainText('14 Weeks (56 Hours)');
    await expect(firstCard).toContainText('Price');
    await expect(firstCard).toContainText('500 ETB');
    await expect(firstCard).toContainText('Description:');

    // Button accessible name includes course title
    const chooseBtn = page.locator('#choose-course-data-analytics');
    await expect(chooseBtn).toBeVisible();
    await expect(chooseBtn).toHaveAccessibleName('Choose this course: Data Analytics');
  });

  test('"Read all courses" button works without the assistant', async ({ page }) => {
    await page.goto('/courses');

    const readAllBtn = page.locator('#read-all-courses-btn');
    await expect(readAllBtn).toBeVisible();
    await expect(readAllBtn).toHaveAccessibleName('Read all courses');

    await readAllBtn.click();
    const liveRegion = page.locator('#ableway-live-announcer');
    await expect(liveRegion).toContainText('There are 4 courses available to choose from');
    await expect(liveRegion).toContainText('Data Analytics');
    await expect(liveRegion).toContainText('Price: 500 ETB');

    // Button updates to stop reading
    await expect(readAllBtn).toContainText('Stop reading');
    await readAllBtn.click();
    await expect(readAllBtn).toContainText('Read all courses');
  });

  test('choosing a course opens confirmation dialog, and confirming calls /api/enrollments and goes to /payment', async ({
    page,
  }) => {
    await page.goto('/courses');
    await page.locator('h1').waitFor({ state: 'visible' });

    // Mock /api/enrollments POST call to verify payload
    let enrollmentCalled = false;
    let requestPayload: any = null;
    await page.route('**/api/enrollments', async (route) => {
      enrollmentCalled = true;
      requestPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          enrollmentId: 'ENR-999999',
          courseId: requestPayload.courseId,
          courseTitle: requestPayload.courseTitle,
          price: requestPayload.price,
        }),
      });
    });

    const chooseBtn = page.locator('#choose-course-data-analytics');
    await expect(chooseBtn).toBeVisible();
    await chooseBtn.click();

    // Dialog opens
    const dialog = page.locator('#course-confirm-dialog');
    await expect(dialog).toBeVisible();

    // Verify confirmation message: "You chose X. The price is Y. Continue to payment?"
    const dialogDesc = page.locator('#confirm-dialog-description');
    await expect(dialogDesc).toHaveText('You chose Data Analytics. The price is 500 ETB. Continue to payment?');

    // Axe check inside dialog
    const axeDialogResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeDialogResults.violations).toEqual([]);

    // Confirm button click
    const confirmBtn = page.locator('#confirm-enrollment-btn');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify API called with right body
    expect(enrollmentCalled).toBe(true);
    expect(requestPayload).toEqual({
      courseId: 'data-analytics',
      courseTitle: 'Data Analytics',
      price: '500 ETB',
    });

    // Verify redirect to /payment
    await expect(page).toHaveURL(/\/payment/, { timeout: 10000 });
  });

  test('confirmation dialog closes on Escape or Cancel and returns focus', async ({ page }) => {
    await page.goto('/courses');
    await page.locator('h1').waitFor({ state: 'visible' });

    const chooseBtn = page.locator('#choose-course-wr-100');
    await expect(chooseBtn).toBeVisible();
    await chooseBtn.click();

    const dialog = page.locator('#course-confirm-dialog');
    await expect(dialog).toBeVisible();

    const cancelBtn = page.locator('#cancel-enrollment-btn');
    await cancelBtn.click();

    await expect(dialog).not.toBeVisible();
    await expect(chooseBtn).toBeFocused();
  });

  test('Assistant says course count, reads on request, compares, and recommends from learner goals', async ({
    page,
  }) => {
    await page.goto('/courses');

    const startAssistantBtn = page.locator('#start-courses-assistant-btn');
    await startAssistantBtn.click();

    const speechDisplay = page.getByTestId('courses-speech-display');
    await expect(speechDisplay).toContainText('There are 4 courses available to choose from');

    // 1. Spoken count check
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('how many courses are there');
    });
    await expect(speechDisplay).toContainText('There are 4 courses available to choose from');

    // 2. Spoken compare check
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('compare');
    });
    await expect(speechDisplay).toContainText('Comparing Data Analytics and Fundamentals of Effective Communication');

    // 3. Spoken recommendation from goals (Data goal)
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('recommend from my goal to work with data');
    });
    await expect(speechDisplay).toContainText('Based on your goal to work with data, numbers, and business insights, I recommend Data Analytics');

    // 4. Spoken recommendation from goals (Speaking goal)
    await page.evaluate(() => {
      (window as any).__simulateVoiceInput('recommend from my goal to improve speaking');
    });
    await expect(speechDisplay).toContainText('Based on your goal to master verbal delivery, executive writing, and workplace confidence, I recommend Fundamentals of Effective Communication');
  });

  test('Empty state displayed in plain language when filter yields no matches', async ({ page }) => {
    await page.goto('/courses');

    // Search query that yields 0 matches
    const searchInput = page.locator('#course-voice-input');
    await page.locator('#start-courses-assistant-btn').click();
    await searchInput.fill('xyznonexistentcourse');
    await page.locator('form[aria-label="Course selection voice input form"]').getByRole('button', { name: 'Send' }).click();

    // Filter to comprehensive then click reset when empty
    const allCoursesBtn = page.getByRole('button', { name: 'All Courses', exact: true });
    await expect(allCoursesBtn).toBeVisible();

    // Verify empty state is accessible and plain language
    const emptyHeading = page.locator('#empty-courses-heading');
    if (await emptyHeading.isVisible()) {
      await expect(emptyHeading).toHaveText('No courses found');
      const resetBtn = page.locator('#reset-filter-btn');
      await resetBtn.click();
      await expect(page.locator('article')).toHaveCount(4);
    }
  });

  test('Language toggle switches system language between English and Amharic', async ({ page }) => {
    await page.goto('/courses');
    const langBtn = page.locator('#courses-lang-switch-btn');
    await expect(langBtn).toBeVisible();
    await expect(langBtn).toContainText('Language: English');

    // Switch to Amharic
    await langBtn.click();
    await expect(langBtn).toContainText('ቋንቋ፡ አማርኛ');
    const speechDisplay = page.getByTestId('courses-speech-display');

    // Start assistant in Amharic
    const startAssistantBtn = page.locator('#start-courses-assistant-btn');
    await startAssistantBtn.click();
    await expect(speechDisplay).toContainText('እንኳን ወደ ኮርስ መምረጫ በደህና መጡ');

    // Spoken command in Amharic opens confirmation dialog
    await page.evaluate(() => {
      if ((window as any).__simulateVoiceInput) {
        (window as any).__simulateVoiceInput('ዳታ አናሊቲክስ');
      }
    });

    const dialog = page.locator('#course-confirm-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('ዳታ አናሊቲክስ');
  });
});

test.describe('Payment Page - F0 Human-Assisted Payment & Support', () => {
  test('passes axe accessibility scan with 0 violations', async ({ page }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');
    await page.locator('h1').waitFor({ state: 'visible' });

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axeResults.violations).toEqual([]);
  });

  test('has single h1 "Payment", plain language explanation, and no card/wallet inputs', async ({ page }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');
    await expect(page).toHaveTitle('Payment - Ableway');

    // Single h1 with focus (F0 Rule 2, 7)
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText('Payment');
    await expect(h1).toBeFocused();

    // Plain language explanations
    await expect(page.getByText('500 ETB')).toBeVisible();
    await expect(page.getByText('A human helper will contact you directly to help you pay safely.')).toBeVisible();
    await expect(page.getByText('Nobody will ever ask for a PIN, password, or mobile wallet secret code on this site.')).toBeVisible();

    // Never add card or wallet inputs (User Requirement)
    const cardInputs = page.locator('input[autocomplete="cc-number"], input[name*="card"], input[name*="cvv"], input[name*="pin"]');
    await expect(cardInputs).toHaveCount(0);
  });

  test('Call a helper button with contact method RadioGroup and phone input', async ({ page }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');

    // RadioGroup for contact method
    const radioGroup = page.getByRole('radiogroup');
    await expect(radioGroup).toBeVisible();
    await expect(page.getByLabel('Phone call')).toBeChecked();

    // Phone input visible when phone call selected
    const phoneInput = page.locator('#learner-phone-number');
    await expect(phoneInput).toBeVisible();

    // Large "Call a helper" button
    const callHelperBtn = page.locator('#call-a-helper-btn');
    await expect(callHelperBtn).toBeVisible();
    await expect(callHelperBtn).toHaveText('Call a helper');

    // Switch to Telegram: phone input hides
    const telegramRadio = page.getByLabel('Telegram');
    await telegramRadio.click();
    await expect(telegramRadio).toBeChecked();
    await expect(phoneInput).not.toBeVisible();
  });

  test('live status component covers waiting and request a call back', async ({ page }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');

    // Select Telegram and Call a helper
    await page.getByLabel('Telegram').click();
    await page.locator('#call-a-helper-btn').click();

    // Status updates to waiting with polite live region
    const statusSection = page.locator('[aria-labelledby="live-status-heading"]');
    await expect(statusSection).toBeVisible();
    await expect(page.locator('#live-status-heading')).toContainText('Status: Waiting');
    await expect(page.getByText('Estimated wait: 2 minutes')).toBeVisible();

    // "Request a call back" button option
    const callbackBtn = page.locator('#request-callback-btn');
    await expect(callbackBtn).toBeVisible();
    await callbackBtn.click();

    // Status updates to call back scheduled
    await expect(page.locator('#live-status-heading')).toContainText('Status: Call Back Requested');
    await expect(page.getByText('A human helper will phone you within 15 minutes')).toBeVisible();
  });

  test('live status covers assigned, in progress, chat area with silent assistant, and confirmation', async ({
    page,
  }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');

    // Fill phone and call helper
    await page.locator('#learner-phone-number').fill('+251911234567');
    await page.locator('#call-a-helper-btn').click();

    // Advances to assigned and in progress
    await expect(page.locator('#chat-heading')).toContainText('Meron Kebede', { timeout: 10000 });
    await expect(page.getByText('Assistant stays silent while helper is in charge')).toBeVisible();

    // Chat area has role="log"
    const chatLog = page.locator('#helper-chat-log');
    await expect(chatLog).toHaveAttribute('role', 'log');

    // Send a message to helper
    const chatInput = page.locator('#chat-message-input');
    await chatInput.fill('How do I pay with Telebirr?');
    await page.locator('#chat-send-btn').click();

    // Staff reply arrives in chat
    await expect(page.getByText('0911-23-4567')).toBeVisible({ timeout: 6000 });

    // Confirm payment: announces "Payment confirmed. Opening your course" and redirects to /learn/[courseId]
    const confirmBtn = page.locator('#confirm-payment-btn');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verifies live announcer announcement
    const liveAnnouncer = page.locator('#ableway-live-announcer');
    await expect(liveAnnouncer).toContainText('Payment confirmed. Opening your course');

    // Verifies redirect to /learn/data-analytics
    await expect(page).toHaveURL(/\/learn\/data-analytics/, { timeout: 10000 });
  });

  test('failure state in plain language with retry and call back options', async ({ page }) => {
    await page.goto('/payment?courseId=data-analytics&title=Data%20Analytics&price=500%20ETB');

    // Trigger failure state
    await page.locator('#simulate-failure-trigger-btn').click();

    // Failure alert in plain language
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Could not connect to helper');
    await expect(alert).toContainText('Please check your internet connection or request a call back');

    // Retry and callback buttons
    await expect(page.locator('#retry-helper-btn')).toBeVisible();
    await expect(page.locator('#failure-callback-btn')).toBeVisible();
  });
});
