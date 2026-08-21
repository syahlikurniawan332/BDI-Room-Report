import { test, expect } from '@playwright/test';

test('root page displays login form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('legacy login URL redirects to root login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL('/');
  await expect(page.getByLabel('Username')).toBeVisible();
});

test('public complaint page loads', async ({ page }) => {
  await page.goto('/pengaduan');
  await expect(page.getByRole('heading', { name: 'Pengaduan Kebersihan' })).toBeVisible();
});
