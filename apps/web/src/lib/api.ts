const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  setTokens(access: string, refresh?: string) {
    this.accessToken = access;
    if (refresh) this.refreshToken = refresh; // backward compat
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', access);
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  getAccessToken() { return this.accessToken; }

  private async fetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    this.loadTokens();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });

    // Auto-refresh on 401
    if (res.status === 401 && this.refreshToken) {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // sends httpOnly cookie
        body: JSON.stringify({}),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        this.setTokens(data.accessToken, data.refreshToken);
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
      } else {
        this.clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Auth
  login(email: string, password: string, mfaCode?: string) {
    return this.fetch<any>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, mfaCode }) });
  }
  logout() {
    const body = this.refreshToken ? JSON.stringify({ refreshToken: this.refreshToken }) : '{}';
    return this.fetch('/auth/logout', { method: 'POST', body }).finally(() => this.clearTokens());
  }
  getMe() { return this.fetch<any>('/users/me'); }

  // Projects
  getProjects(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/projects${qs}`);
  }
  getProject(id: string) { return this.fetch<any>(`/projects/${id}`); }
  createProject(data: any) { return this.fetch<any>('/projects', { method: 'POST', body: JSON.stringify(data) }); }
  updateProject(id: string, data: any) { return this.fetch<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Tasks
  getTasks(projectId: string, params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/projects/${projectId}/tasks${qs}`);
  }
  getTask(id: string) { return this.fetch<any>(`/tasks/${id}`); }
  createTask(projectId: string, data: any) { return this.fetch<any>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }); }
  updateTask(id: string, data: any) { return this.fetch<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Files
  getPresignedUpload(data: any) { return this.fetch<any>('/files/presigned-url', { method: 'POST', body: JSON.stringify(data) }); }
  registerFile(data: any) { return this.fetch<any>('/files', { method: 'POST', body: JSON.stringify(data) }); }
  getDownloadUrl(fileId: string) { return this.fetch<any>(`/files/${fileId}/download`); }

  // Notifications
  getNotifications(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/notifications${qs}`);
  }
  markNotificationRead(id: string) { return this.fetch<any>(`/notifications/${id}/read`, { method: 'PATCH' }); }

  // Approvals
  getApprovals(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/approvals${qs}`);
  }

  // Portal
  portalGetProjects(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/portal/projects${qs}`);
  }
  portalGetProject(id: string) { return this.fetch<any>(`/portal/projects/${id}`); }
  portalGetDeliverables(projectId: string) { return this.fetch<any>(`/portal/projects/${projectId}/deliverables`); }
  portalGetApprovals(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/portal/approvals${qs}`);
  }

  // Search
  search(q: string, params?: { types?: string; limit?: number }) {
    const qs = new URLSearchParams({ q });
    if (params?.types) qs.set('types', params.types);
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.fetch<any>(`/search?${qs}`);
  }

  // Reports
  getDashboardStats() { return this.fetch<any>('/reports/dashboard'); }
  getProjectReport(id: string) { return this.fetch<any>(`/reports/projects/${id}/summary`); }
  getProductivityReport(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/reports/productivity${qs}`);
  }

  // Clients
  getClients(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/clients${qs}`);
  }
  getClient(id: string) { return this.fetch<any>(`/clients/${id}`); }
  createClient(data: any) { return this.fetch<any>('/clients', { method: 'POST', body: JSON.stringify(data) }); }
  updateClient(id: string, data: any) { return this.fetch<any>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  deleteClient(id: string) { return this.fetch<any>(`/clients/${id}`, { method: 'DELETE' }); }

  // Team
  getTeam() { return this.fetch<any>('/users/team'); }

  // Comments
  getComments(taskId: string) { return this.fetch<any>(`/tasks/${taskId}/comments`); }
  createComment(taskId: string, data: any) { return this.fetch<any>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(data) }); }

  // Approvals
  getApprovals(params?: Record<string, any>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.fetch<any>(`/approvals${qs}`);
  }
  resolveApproval(id: string, data: any) { return this.fetch<any>(`/approvals/${id}/resolve`, { method: 'PATCH', body: JSON.stringify(data) }); }
}

export const api = new ApiClient();
