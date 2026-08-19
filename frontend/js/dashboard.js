// Security: User Dashboard JavaScript

// Security: Require authentication on page load
requireAuth();

// Load user profile on page load
document.addEventListener('DOMContentLoaded', async () => {
  loadUserProfile();
  setupEventListeners();
});

// Setup event listeners for dashboard
function setupEventListeners() {
  const editBtn = document.getElementById('editBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const profileForm = document.getElementById('profileForm');

  if (editBtn) {
    editBtn.addEventListener('click', enterEditMode);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', exitEditMode);
  }

  if (profileForm) {
    profileForm.addEventListener('submit', updateProfile);
  }
}

// Load user profile from API
async function loadUserProfile() {
  try {
    const response = await apiCall('/api/user/profile', {
      method: 'GET'
    });

    const data = await response.json();

    if (response.ok) {
      displayProfile(data);
    } else {
      showError(data.error || 'Failed to load profile');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Connection error. Please try again.');
  }
}

// Display profile information
function displayProfile(data) {
  // Security: Escape HTML to prevent XSS
  const userName = escapeHtml(data.name || '-');
  const userEmail = escapeHtml(data.email || '-');
  const studentId = escapeHtml(data.studentId || '-');
  const phone = escapeHtml(data.phone || '-');
  const role = escapeHtml(data.role || '-');
  const createdAt = data.createdAt ? formatDate(data.createdAt) : '-';

  // Update display
  document.getElementById('userName').textContent = userName;
  document.getElementById('displayName').textContent = userName;
  document.getElementById('displayEmail').textContent = userEmail;
  document.getElementById('displayStudentId').textContent = studentId;
  document.getElementById('displayPhone').textContent = phone;
  document.getElementById('displayRole').textContent = role;
  document.getElementById('displayCreatedAt').textContent = createdAt;

  // Update edit form
  document.getElementById('editName').value = data.name || '';
  document.getElementById('editPhone').value = data.phone || '';
}

// Enter edit mode
function enterEditMode() {
  document.getElementById('viewMode').classList.remove('active');
  document.getElementById('editMode').classList.add('active');
}

// Exit edit mode
function exitEditMode() {
  document.getElementById('editMode').classList.remove('active');
  document.getElementById('viewMode').classList.add('active');
}

// Update profile
async function updateProfile(e) {
  e.preventDefault();

  const name = document.getElementById('editName').value.trim();
  const phone = document.getElementById('editPhone').value.trim();

  // Security: Validate inputs on client side
  if (!name || !phone) {
    showError('Name and phone are required');
    return;
  }

  if (name.length < 2) {
    showError('Name must be at least 2 characters');
    return;
  }

  try {
    const response = await apiCall('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, phone })
    });

    const data = await response.json();

    if (response.ok) {
      clearMessages();
      showSuccess('Profile updated successfully!');

      // Reload profile
      setTimeout(() => {
        loadUserProfile();
        exitEditMode();
      }, 1500);
    } else {
      showError(data.error || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    showError('Connection error. Please try again.');
  }
}
