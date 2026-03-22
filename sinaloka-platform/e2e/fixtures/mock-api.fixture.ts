import { type Page, type Route } from '@playwright/test';
import { test as authedTest } from './auth.fixture';

export class MockApi {
  constructor(private page: Page) {}

  private async intercept(method: string, pattern: string, status: number, body: unknown) {
    await this.page.route(pattern, async (route: Route) => {
      if (route.request().method() === method) {
        const contentType = body instanceof Buffer
          ? 'application/pdf'
          : 'application/json';
        await route.fulfill({
          status,
          contentType,
          body: body instanceof Buffer ? body : JSON.stringify(body),
        });
      } else {
        await route.fallback();
      }
    });
  }

  onGet(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('GET', pattern, status, body) };
  }
  onPost(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('POST', pattern, status, body) };
  }
  onPatch(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('PATCH', pattern, status, body) };
  }
  onDelete(pattern: string) {
    return { respondWith: (status: number, body: unknown) => this.intercept('DELETE', pattern, status, body) };
  }
}

export const test = authedTest.extend<{ mockApi: MockApi }>({
  mockApi: async ({ authedPage }, use) => {
    const mockApi = new MockApi(authedPage);
    await use(mockApi);
  },
});

export { expect } from '@playwright/test';
