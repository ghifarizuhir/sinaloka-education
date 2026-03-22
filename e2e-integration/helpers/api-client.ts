import axios, { type AxiosInstance } from 'axios';
import { API_BASE_URL } from './constants.js';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL = API_BASE_URL) {
    this.client = axios.create({ baseURL });
  }

  async loginAs(account: { email: string; password: string }): Promise<void> {
    const res = await this.client.post('/auth/login', {
      email: account.email,
      password: account.password,
    });
    this.client.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
  }

  async get<T = any>(path: string) {
    return this.client.get<T>(path);
  }

  async post<T = any>(path: string, data?: any) {
    return this.client.post<T>(path, data);
  }

  async patch<T = any>(path: string, data?: any) {
    return this.client.patch<T>(path, data);
  }

  async delete<T = any>(path: string) {
    return this.client.delete<T>(path);
  }
}
