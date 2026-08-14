import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'BDI Medan Cleaning Control' })).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('public complaint page loads', async ({ page }) => {
  await page.goto('/pengaduan');
  await expect(page.getByRole('heading', { name: 'Pengaduan Kebersihan' })).toBeVisible();
});
