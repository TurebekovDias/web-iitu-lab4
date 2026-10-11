import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  auth = inject(AuthService);
  mode = signal<'login' | 'register'>('login');
  errors = signal<{ username?: string; email?: string; password?: string; form?: string }>({});
  form = { username: '', email: '', password: '' };

  ngOnInit() {
    this.auth.me().subscribe({ next: (u) => this.auth.user.set(u), error: () => {} });
  }

  submit() {
    const req = this.mode() === 'login'
      ? this.auth.login(this.form)
      : this.auth.register(this.form);

    req.subscribe({
      next: (u) => {
        this.auth.user.set(u);
        this.errors.set({});
      },
      error: (e) => this.errors.set(e.error?.errors ?? { form: 'Нет связи с сервером' })
    });
  }

  logout() {
    this.auth.logout().subscribe(() => this.auth.user.set(null));
  }

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.errors.set({});
  }
}
