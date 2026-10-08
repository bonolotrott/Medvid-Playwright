import { test, expect } from '@playwright/test';

test.describe('MedVid - Patient Registration', () => {

  test('patient can register with valid details', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Navigate to patient registration
    await page.getByRole('link', { name: '📝 Register as Patient' }).click();

    // 3. Use unique values so the test can run repeatedly
    const randomPhone = '076' + Math.floor(1000000 + Math.random() * 9000000);
    const randomName = 'Playwright Patient ' + Math.floor(Math.random() * 10000);

    // 4. Fill the form
    await page.getByRole('textbox', { name: 'Enter your full name' }).fill(randomName);
    await page.getByRole('textbox', { name: '-digit number' }).fill(randomPhone);
    await page.getByRole('textbox', { name: 'email@example.com' }).fill(`test${randomPhone}@gmail.com`);
    await page.locator('input[type="date"]').fill('2005-04-25');

    // 5. Submit
    await page.getByRole('button', { name: 'Register' }).click();

    // 6. WAIT — let's first see what actually happens here
    await page.waitForTimeout(2000);
  });

});