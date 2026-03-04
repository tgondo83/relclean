const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'reliable_auth_token';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options?.headers,
        },
      });

      // If 401, the token may be expired — signal for logout
      if (response.status === 401) {
        const data = await response.json().catch(() => ({}));
        // Dispatch a custom event so AuthContext can handle logout
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        return { error: data.error || 'Session expired. Please log in again.' };
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || `HTTP error! status: ${response.status}`;
        return { error: errorMessage };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Orders
  async getOrders(branchId?: string) {
    const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return this.request(`/orders${query}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData: any) {
    return this.request<{ _id?: string; id?: string; orderNumber?: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrder(id: string, updates: any) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteOrder(id: string) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Customers
  async getCustomers() {
    return this.request<{ customers: unknown[] } | unknown[]>('/customers');
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customerData: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id: string, updates: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Hardware
  async getHardware() {
    return this.request('/hardware');
  }

  async getHardwareItem(id: string) {
    return this.request(`/hardware/${id}`);
  }

  async createHardware(hardwareData: any) {
    return this.request('/hardware', {
      method: 'POST',
      body: JSON.stringify(hardwareData),
    });
  }

  async updateHardware(id: string, updates: any) {
    return this.request(`/hardware/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteHardware(id: string) {
    return this.request(`/hardware/${id}`, {
      method: 'DELETE',
    });
  }

  // Metrics
  private buildMetricsQuery(params?: { branchId?: string; dateFrom?: string; dateTo?: string; [key: string]: string | undefined }) {
    if (!params) return '';
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&');
  }

  async getDashboardMetrics(branchId?: string, dateFrom?: string, dateTo?: string) {
    const query = this.buildMetricsQuery({ branchId, dateFrom, dateTo });
    return this.request(`/metrics/dashboard${query}`);
  }

  async getSalesMetrics(branchId?: string, dateFrom?: string, dateTo?: string) {
    const query = this.buildMetricsQuery({ branchId, dateFrom, dateTo });
    return this.request(`/metrics/sales${query}`);
  }

  async getPerformanceMetrics(branchId?: string) {
    const query = this.buildMetricsQuery({ branchId });
    return this.request(`/metrics/performance${query}`);
  }

  async getRevenueByPaymentType(branchId?: string, dateFrom?: string, dateTo?: string) {
    const query = this.buildMetricsQuery({ branchId, dateFrom, dateTo });
    return this.request(`/metrics/revenue-by-payment-type${query}`);
  }

  async getRevenueByCurrency(branchId?: string, dateFrom?: string, dateTo?: string) {
    const query = this.buildMetricsQuery({ branchId, dateFrom, dateTo });
    return this.request(`/metrics/revenue-by-currency${query}`);
  }

  async getTopCustomers(branchId?: string, dateFrom?: string, dateTo?: string, limit?: number) {
    const query = this.buildMetricsQuery({ branchId, dateFrom, dateTo, limit: limit?.toString() });
    return this.request(`/metrics/top-customers${query}`);
  }

  async getDailyOrders(branchId?: string, days?: number) {
    const query = this.buildMetricsQuery({ branchId, days: days?.toString() });
    return this.request(`/metrics/daily-orders${query}`);
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, updates: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async resetUserPassword(id: string, newPassword: string) {
    return this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Branches
  async getBranches() {
    return this.request('/branches');
  }

  async getBranch(id: string) {
    return this.request(`/branches/${id}`);
  }

  async createBranch(branchData: any) {
    return this.request('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
  }

  async updateBranch(id: string, updates: any) {
    return this.request(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteBranch(id: string) {
    return this.request(`/branches/${id}`, {
      method: 'DELETE',
    });
  }

  // Company
  async getCompany() {
    return this.request('/company');
  }

  async updateCompany(companyData: any) {
    return this.request('/company', {
      method: 'PUT',
      body: JSON.stringify(companyData),
    });
  }

  // Exchange Rates
  async getExchangeRates() {
    return this.request('/exchange-rates');
  }

  async getCurrentExchangeRate() {
    return this.request<{ rate: number; updatedAt?: string; _id?: string }>('/exchange-rates/current');
  }

  async createExchangeRate(rateData: any) {
    return this.request<{ rate: number; updatedAt?: string; _id?: string }>('/exchange-rates', {
      method: 'POST',
      body: JSON.stringify(rateData),
    });
  }

  async updateExchangeRate(id: string, updates: any) {
    return this.request(`/exchange-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Payments
  async getPayments(params?: { orderId?: string; customerId?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.orderId) searchParams.set('orderId', params.orderId);
    if (params?.customerId) searchParams.set('customerId', params.customerId);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request(`/payments${query ? `?${query}` : ''}`);
  }

  async getPaymentsForOrder(orderId: string) {
    return this.request(`/payments/order/${orderId}`);
  }

  async getPaymentSummary(orderId: string) {
    return this.request(`/payments/order/${orderId}/summary`);
  }

  async getPayment(id: string) {
    return this.request(`/payments/${id}`);
  }

  async createPayment(paymentData: any) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async updatePaymentStatus(id: string, status: string) {
    return this.request(`/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Items (Catalog)
  async getItems(params?: { category?: string; branchId?: string; isActive?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.branchId) searchParams.set('branchId', params.branchId);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));

    const query = searchParams.toString();
    return this.request(`/items${query ? `?${query}` : ''}`);
  }

  async getItem(id: string) {
    return this.request(`/items/${id}`);
  }

  async createItem(itemData: any) {
    return this.request('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  async updateItem(id: string, updates: any) {
    return this.request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteItem(id: string) {
    return this.request(`/items/${id}`, {
      method: 'DELETE',
    });
  }

  async seedItems() {
    return this.request('/items/seed', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
