import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';

export class LoginComponent extends LitElement {
  @property({ type: Boolean }) showLogin = false;
  @state() private isLogin = true;
  @state() private email = '';
  @state() private password = '';
  @state() private name = '';
  @state() private isLoading = false;
  @state() private errorMessage = '';

  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    }

    .login-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2px;
      border-radius: 20px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .login-content {
      background: white;
      padding: 2rem;
      border-radius: 18px;
      text-align: center;
    }

    .login-title {
      font-size: 1.8rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .form-group {
      margin-bottom: 1.5rem;
      text-align: left;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      min-height: 1.2rem;
    }

    .login-button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      margin-bottom: 1rem;
    }

    .login-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    .login-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .toggle-mode {
      color: #666;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
    }

    .toggle-mode:hover {
      color: #667eea;
    }

    .social-login {
      margin-top: 1.5rem;
      border-top: 1px solid #eee;
      padding-top: 1.5rem;
    }

    .social-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }

    .social-button {
      padding: 10px;
      border: 2px solid #e1e5e9;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .social-button:hover {
      border-color: #667eea;
      transform: translateY(-2px);
    }

    .social-button.google:hover {
      border-color: #db4437;
    }

    .social-button.github:hover {
      border-color: #333;
    }
  `;

  private async handleSubmit(event: Event) {
    event.preventDefault();
    this.isLoading = true;
    this.errorMessage = '';

    try {
      if (this.isLogin) {
        await this.handleLogin();
      } else {
        await this.handleRegister();
      }
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'An error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  private async handleLogin() {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and user data
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Dispatch login success event
    this.dispatchEvent(new CustomEvent('login-success', {
      detail: { user: data.user },
      bubbles: true,
      composed: true,
    }));

    this.showLogin = false;
  }

  private async handleRegister() {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.email,
        password: this.password,
        name: this.name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Auto-login after registration
    await this.handleLogin();
  }

  private toggleMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
    this.email = '';
    this.password = '';
    this.name = '';
  }

  private handleSocialLogin(provider: string) {
    // Redirect to social login endpoint
    window.location.href = `/api/auth/${provider}`;
  }

  render() {
    if (!this.showLogin) {
      return html`<div></div>`;
    }

    return html`
      <div class="login-overlay">
        <div class="login-container">
          <div class="login-content">
            <h2 class="login-title">
              ${this.isLogin ? 'Welcome Back!' : 'Create Account'}
            </h2>
            
            <form @submit=${this.handleSubmit}>
              ${!this.isLogin ? html`
                <div class="form-group">
                  <label for="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    .value=${this.name}
                    @input=${(e: Event) => this.name = (e.target as HTMLInputElement).value}
                    required
                    ?disabled=${this.isLoading}
                    placeholder="Enter your full name"
                  />
                </div>
              ` : ''}
              
              <div class="form-group">
                <label for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  .value=${this.email}
                  @input=${(e: Event) => this.email = (e.target as HTMLInputElement).value}
                  required
                  ?disabled=${this.isLoading}
                  placeholder="Enter your email"
                />
              </div>
              
              <div class="form-group">
                <label for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  .value=${this.password}
                  @input=${(e: Event) => this.password = (e.target as HTMLInputElement).value}
                  required
                  ?disabled=${this.isLoading}
                  placeholder="Enter your password"
                  minlength="6"
                />
              </div>
              
              <div class="error-message">${this.errorMessage}</div>
              
              <button
                type="submit"
                class="login-button"
                ?disabled=${this.isLoading || !this.email || !this.password || (!this.isLogin && !this.name)}
              >
                ${this.isLoading ? 'Please wait...' : (this.isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>
            
            <div>
              <span class="toggle-mode" @click=${this.toggleMode}>
                ${this.isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </span>
            </div>
            
            <div class="social-login">
              <p style="color: #666; margin-bottom: 1rem;">Or continue with</p>
              <div class="social-buttons">
                <button
                  class="social-button google"
                  @click=${() => this.handleSocialLogin('google')}
                  ?disabled=${this.isLoading}
                  title="Sign in with Google"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#DB4437" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
                
                <button
                  class="social-button github"
                  @click=${() => this.handleSocialLogin('github')}
                  ?disabled=${this.isLoading}
                  title="Sign in with GitHub"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#333" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('login-component', LoginComponent);