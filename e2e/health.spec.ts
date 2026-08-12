import { test, expect } from '@playwright/test';

test.describe('Health Endpoints', () => {
  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('trak');
    expect(data.ts).toBeDefined();
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('health endpoint does not require authentication', async ({ request }) => {
    const response = await request.get('/api/health');
    // APIResponse.status is a method in Playwright — not a property.
    expect(response.status()).toBe(200);
  });

  test('ready endpoint returns status', async ({ request }) => {
    const response = await request.get('/api/ready');
    // Ready endpoint may return 200 (ready) or 503 (not ready) depending on DB reachability.
    expect([200, 503]).toContain(response.status());

    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(['ready', 'not_ready']).toContain(data.status);
    expect(data.database).toBeDefined();
    expect(['up', 'down']).toContain(data.database);
  });

  test('ready endpoint does not require authentication', async ({ request }) => {
    const response = await request.get('/api/ready');
    // Should not return 401 or 403
    expect(response.status()).not.toBe(401);
    expect(response.status()).not.toBe(403);
  });
});

test.describe('Security Headers', () => {
  test('responses include security headers', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();
    
    // Check for security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBeDefined();
    expect(headers['permissions-policy']).toBeDefined();
  });
});
