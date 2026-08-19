// Security: Authentication JavaScript Utilities

// JWT is stored securely in an HttpOnly cookie

function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}


// Security: Logout user and clear session
async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Security: Redirect to login if not authenticated
async function requireAuth() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (!response.ok) {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return false;
    }

    const data = await response.json();
    localStorage.setItem('user', JSON.stringify(data.user));

    return true;

  } catch (error) {
    window.location.href = 'login.html';
    return false;
  }
}

// Security: Redirect to login if not admin
async function requireAdmin() {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (!response.ok) {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
      return false;
    }

    const data = await response.json();

    if (data.user.role !== 'admin') {
      alert('Access Denied: Admin privileges required');
      window.location.href = 'dashboard.html';
      return false;
    }

    localStorage.setItem('user', JSON.stringify(data.user));
    return true;

  } catch (error) {
    window.location.href = 'login.html';
    return false;
  }
}

// Security: API call using HttpOnly session cookie 
async function apiCall(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfResponse = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });

    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }

    const csrfData = await csrfResponse.json();

    headers['x-csrf-token'] = csrfData.csrfToken;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return;
  }

  return response;
}

// Security: Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Security: Display success message
function showSuccess(message) {
  const element = document.getElementById('successMessage');
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.classList.remove('error');
    element.classList.add('success');
  }
}

// Security: Display error message
function showError(message) {
  const element = document.getElementById('errorMessage');
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.classList.remove('success');
    element.classList.add('error');
  }
}

// Security: Clear messages
function clearMessages() {
  const successElement = document.getElementById('successMessage');
  const errorElement = document.getElementById('errorMessage');
  if (successElement) successElement.style.display = 'none';
  if (errorElement) errorElement.style.display = 'none';
}

// Security: Format date to readable string
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Security: Setup logout button if it exists
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Display current user in navbar
  const userInfoElement = document.getElementById('userInfo');
  if (userInfoElement) {
    const user = getCurrentUser();
    if (user) {
      userInfoElement.textContent = `${user.name} (${user.role})`;
    }
  }
});
