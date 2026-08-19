// Security: Admin Dashboard JavaScript

// Security: Require admin authentication
requireAdmin();

// Load admin data on page load
document.addEventListener('DOMContentLoaded', async () => {
  loadUsers();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  const refreshBtn = document.getElementById('refreshBtn');
  const auditBtn = document.getElementById('auditBtn');
  const closeAuditBtn = document.getElementById('closeAuditBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadUsers);
  }

  if (auditBtn) {
    auditBtn.addEventListener('click', showAuditLogs);
  }

  if (closeAuditBtn) {
    closeAuditBtn.addEventListener('click', closeAuditLogs);
  }
}

// Load all users
async function loadUsers() {
  try {
    const response = await apiCall('/api/admin/users', {
      method: 'GET'
    });

    const users = await response.json();

    if (response.ok) {
      displayUsers(users);
      clearMessages();
    } else {
      showError(users.error || 'Failed to load users');
    }
  } catch (error) {
    console.error('Error loading users:', error);
    showError('Connection error. Please try again.');
  }
}

// Display users in table
function displayUsers(users) {
  const tbody = document.getElementById('usersTableBody');

  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (user) => `
    <tr>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.studentId)}</td>
      <td>${escapeHtml(user.phone)}</td>
      <td>
        <select id="role-${user.id}" data-user-id="${user.id}" data-user-email="${user.email}" data-current-role="${user.role}" style="padding: 0.5rem; border: 1px solid #bdc3c7; border-radius: 4px;">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <button class="btn danger delete-btn" data-user-id="${user.id}" data-user-email="${user.email}" style="padding: 0.5rem 1rem; font-size: 0.85rem;">Delete</button>
      </td>
    </tr>
  `
    )
    .join('');

  // Add event listeners for role changes
  users.forEach((user) => {
    const roleSelect = document.getElementById(`role-${user.id}`);
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const currentRole = e.target.dataset.currentRole;
        const newRole = e.target.value;
        
        if (currentRole === newRole) return;
        
        showRoleConfirmation(user.id, user.email, newRole, (confirmed) => {
          if (confirmed) {
            changeUserRole(user.id, newRole);
          } else {
            e.target.value = currentRole;
          }
        });
      });
    }
  });

  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const userId = e.target.dataset.userId;
      const userEmail = e.target.dataset.userEmail;
      showDeleteConfirmation(userId, userEmail);
    });
  });
}

// Show role change confirmation dialog
function showRoleConfirmation(userId, userEmail, newRole, callback) {
  const message = `Change role for ${userEmail} to ${newRole}?`;
  if (confirm(message)) {
    callback(true);
  } else {
    callback(false);
  }
}

// Show delete confirmation dialog
function showDeleteConfirmation(userId, userEmail) {
  const message = `Are you sure you want to delete ${userEmail}?\n\nThis action cannot be undone.`;
  if (confirm(message)) {
    deleteUser(userId);
  }
}

// Change user role
async function changeUserRole(userId, newRole) {
  const user = getCurrentUser();
  const userIdStr = String(userId);
  const currentUserIdStr = user && user.id ? String(user.id) : '';

  // Check if trying to demote self
  if (currentUserIdStr && currentUserIdStr === userIdStr && newRole !== 'admin') {
    alert('Cannot demote yourself from admin');
    location.reload();
    return;
  }

  try {
    const response = await apiCall(`/api/admin/users/${userIdStr}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('User role updated successfully!');
      
      // Update the select element immediately
      const roleSelect = document.getElementById(`role-${userIdStr}`);
      if (roleSelect) {
        roleSelect.value = newRole;
        roleSelect.dataset.currentRole = newRole;
      }
      
      // Reload after a delay to ensure database is updated
      setTimeout(() => {
        loadUsers();
      }, 1500);
    } else {
      showError(data.error || 'Failed to update user role');
      setTimeout(() => {
        loadUsers();
      }, 500);
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    showError('Connection error. Please try again.');
    setTimeout(() => {
      loadUsers();
    }, 500);
  }
}

// Delete user
async function deleteUser(userId) {
  const currentUser = getCurrentUser();
  const userIdStr = String(userId);
  const currentUserIdStr = currentUser && currentUser.id ? String(currentUser.id) : '';

  if (currentUserIdStr && currentUserIdStr === userIdStr) {
    alert('Cannot delete your own account');
    return;
  }

  try {
    const response = await apiCall(`/api/admin/users/${userIdStr}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('User deleted successfully!');
      setTimeout(() => {
        loadUsers();
      }, 1000);
    } else {
      showError(data.error || 'Failed to delete user');
      loadUsers();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showError('Connection error. Please try again.');
    loadUsers();
  }
}

// Show audit logs modal
async function showAuditLogs() {
  try {
    const response = await apiCall('/api/admin/audit-logs', {
      method: 'GET'
    });

    const logs = await response.json();

    if (response.ok) {
      displayAuditLogs(logs);
      document.getElementById('auditModal').style.display = 'block';
    } else {
      showError(logs.error || 'Failed to load audit logs');
    }
  } catch (error) {
    console.error('Error loading audit logs:', error);
    showError('Connection error. Please try again.');
  }
}

// Display audit logs
function displayAuditLogs(logs) {
  const tbody = document.getElementById('auditLogsBody');

  if (!logs || logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No audit logs found</td></tr>';
    return;
  }

  tbody.innerHTML = logs
    .map(
      (log) => `
    <tr>
      <td>${escapeHtml(log.action)}</td>
      <td>${escapeHtml(log.user_email || '-')}</td>
      <td>${escapeHtml(log.ip_address || '-')}</td>
      <td>${formatDate(log.created_at)}</td>
    </tr>
  `
    )
    .join('');
}

// Close audit logs modal
function closeAuditLogs() {
  document.getElementById('auditModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('auditModal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});
