import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

export interface User {
  id: number;
  username: string;
  email: string;
}

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  user = signal<User | null>(null);

  me() {
    return this.http.get<User>(`${API}/me`, { withCredentials: true });
  }

  register(body: { username: string; email: string; password: string }) {
    return this.http.post<User>(`${API}/register`, body, { withCredentials: true });
  }

  login(body: { email: string; password: string }) {
    return this.http.post<User>(`${API}/login`, body, { withCredentials: true });
  }

  logout() {
    return this.http.post(`${API}/logout`, null, { withCredentials: true });
  }
}
