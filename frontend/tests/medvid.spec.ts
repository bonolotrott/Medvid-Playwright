import { test, expect } from '@playwright/test';

test.describe('MedVid - Doctor Flow', () => {

  test('doctor can login with valid credentials', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Click the Doctor Login link
    await page.getByRole('link', { name: '👨‍⚕️ Doctor Login' }).click();

    // 3. Fill in credentials
    await page.getByRole('textbox', { name: 'doctor@medvid.com' }).fill('doctor@medvid.com');
    await page.getByRole('textbox', { name: 'Enter password' }).fill('password123');

    // 4. Submit
    await page.getByRole('button', { name: 'Login' }).click();

    // 5. Verify we're on the doctor dashboard
    await expect(page).toHaveURL(/doctor|dashboard/i, { timeout: 5000 });
    await expect(page.getByRole('button', { name: '📞 Call Next Patient' })).toBeVisible();
  });

  test('doctor sees error with invalid password', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '👨‍⚕️ Doctor Login' }).click();

    await page.getByRole('textbox', { name: 'doctor@medvid.com' }).fill('doctor@medvid.com');
    await page.getByRole('textbox', { name: 'Enter password' }).fill('wrongpassword');
    await page.getByRole('button', { name: 'Login' }).click();

    // Expect an error message
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('doctor can call next patient', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByRole('link', { name: '👨‍⚕️ Doctor Login' }).click();
    await page.getByRole('textbox', { name: 'doctor@medvid.com' }).fill('doctor@medvid.com');
    await page.getByRole('textbox', { name: 'Enter password' }).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for dashboard
    const callNextBtn = page.getByRole('button', { name: '📞 Call Next Patient' });
    await expect(callNextBtn).toBeVisible({ timeout: 5000 });

    // Click once and verify no error
    await callNextBtn.click();

    // Adjust this based on what happens after the click
    // e.g. a patient card appears, or a toast message
    await page.waitForTimeout(1000); // just observe for now
  });

});