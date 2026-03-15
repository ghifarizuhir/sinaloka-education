import { test as base, Page, Route } from '@playwright/test';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

class MockRoute {
  private _delay = 0;

  constructor(
    private page: Page,
    private urlPattern: string,
    private method: HttpMethod,
  ) {}

  delay(ms: number): this {
    this._delay = ms;
    return this;
  }

  async respondWith(status: number, body: unknown = {}): Promise<void> {
    await this.page.route(this.urlPattern, async (route: Route) => {
      if (route.request().method() !== this.method) {
        await route.fallback();
        return;
      }
      if (this._delay > 0) {
        await new Promise((r) => setTimeout(r, this._delay));
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
  }
}

class MockApi {
  constructor(private page: Page) {}

  onGet(url: string) {
    return new MockRoute(this.page, url, 'GET');
  }
  onPost(url: string) {
    return new MockRoute(this.page, url, 'POST');
  }
  onPatch(url: string) {
    return new MockRoute(this.page, url, 'PATCH');
  }
  onPut(url: string) {
    return new MockRoute(this.page, url, 'PUT');
  }
  onDelete(url: string) {
    return new MockRoute(this.page, url, 'DELETE');
  }
}

export const test = base.extend<{ mockApi: MockApi }>({
  mockApi: async ({ page }, use) => {
    const mockApi = new MockApi(page);
    await use(mockApi);
    // Routes are auto-cleared when page closes
  },
});

export { expect } from '@playwright/test';
export { MockApi };
