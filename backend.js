// ===== Excel Analyzer App – Fixed JavaScript =====

// Global Variables
let currentUser = null;
let excelData = null;
let currentChart = null;
let users = [];
let uploads = [];
let adminRequests = [];

try {
  users = JSON.parse(localStorage.getItem('users') || '[]');
  uploads = JSON.parse(localStorage.getItem('uploads') || '[]');
  adminRequests = JSON.parse(localStorage.getItem('adminRequests') || '[]');
} catch (e) {
  // If localStorage is corrupted, reset structures
  users = [];
  uploads = [];
  adminRequests = [];
}

// Initialize Super Admin if not exists
if (!users.find(user => user.role === 'superadmin')) {
  users.push({
    id: 'superadmin_1',
    name: 'Super Admin',
    email: 'superadmin123@excelviz.com',
    password: 'superadmin123',
    role: 'superadmin',
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('users', JSON.stringify(users));
}

// ===================== Utility Functions =====================
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  const pageEl = document.getElementById(pageId);
  if (pageEl) pageEl.classList.add('active');

  // Show/hide logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    if (pageId === 'welcomePage') {
      logoutBtn.style.display = 'none';
    } else {
      logoutBtn.style.display = 'block';
    }
  }
}

// ===================== Navigation =====================
function showWelcome() { showPage('welcomePage'); }
function showUserLogin() { showPage('userLoginPage'); }
function showUserSignup() { showPage('userSignupPage'); }
function showAdminLogin() { showPage('adminLoginPage'); }
function showSuperAdminLogin() { showPage('superAdminLoginPage'); }

// ===================== Authentication =====================
function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById('userLoginEmail').value;
  const password = document.getElementById('userLoginPassword').value;

  const user = users.find(u => u.email === email && u.password === password && u.role === 'user');
  if (user) {
    currentUser = user;
    saveCurrentUser();
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `Welcome, ${user.name}`;
    showPage('userDashboard');
    loadUserData();
    showNotification('User login successful!');
  } else {
    showNotification('Invalid user credentials!', 'error');
  }
}

function handleUserSignup(e) {
  e.preventDefault();
  const name = document.getElementById('userSignupName').value;
  const email = document.getElementById('userSignupEmail').value;
  const password = document.getElementById('userSignupPassword').value;

  if (users.find(u => u.email === email)) {
    showNotification('Email already exists!', 'error');
    return;
  }

  const newUser = {
    id: 'user_' + Date.now(),
    name,
    email,
    password,
    role: 'user',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  showNotification('User account created successfully! Please login.');
  showUserLogin();
}

function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminLoginEmail').value;
  const password = document.getElementById('adminLoginPassword').value;

  const user = users.find(u => u.email === email && u.password === password && u.role === 'admin');
  if (user) {
    currentUser = user;
    saveCurrentUser();
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `Welcome Admin, ${user.name}`;
    showPage('adminDashboard');
    loadAdminData();
    showNotification('Admin login successful!');
  } else {
    showNotification('Invalid admin credentials! Contact Super Admin for access.', 'error');
  }
}

function handleSuperAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('superAdminLoginEmail').value;
  const password = document.getElementById('superAdminLoginPassword').value;

  const user = users.find(u => u.email === email && u.password === password && u.role === 'superadmin');
  if (user) {
    currentUser = user;
    saveCurrentUser();
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `Welcome Super Admin, ${user.name}`;
    showPage('superAdminDashboard');
    loadSuperAdminData();
    showNotification('Super Admin login successful!');
  } else {
    showNotification('Invalid Super Admin credentials!', 'error');
  }
}

// ===================== File Upload and Processing =====================
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    excelData = XLSX.utils.sheet_to_json(firstSheet);

    // Save upload record
    const upload = {
      id: 'upload_' + Date.now(),
      userId: currentUser.id,
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      rowCount: excelData.length
    };
    uploads.push(upload);
    localStorage.setItem('uploads', JSON.stringify(uploads));

    displayDataPreview();
    setupChartControls();
    const chartSection = document.getElementById('chartSection');
    if (chartSection) chartSection.style.display = 'block';
    loadUserData();
    showNotification('File uploaded successfully!');
  };
  reader.readAsArrayBuffer(file);
}

function displayDataPreview() {
  if (!excelData || excelData.length === 0) return;

  const preview = document.getElementById('dataPreview');
  if (preview) preview.style.display = 'block';

  const headers = Object.keys(excelData[0]);
  const previewData = excelData.slice(0, 10); // Show first 10 rows

  let html = '<table><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';

  previewData.forEach(row => {
    html += '<tr>';
    headers.forEach(header => {
      const cell = row[header] == null ? '' : row[header];
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const table = document.getElementById('dataTable');
  if (table) table.innerHTML = html;
}

function setupChartControls() {
  if (!excelData || excelData.length === 0) return;

  const headers = Object.keys(excelData[0]);
  const xAxis = document.getElementById('xAxis');
  const yAxis = document.getElementById('yAxis');

  if (!xAxis || !yAxis) return;

  xAxis.innerHTML = '<option value="">Select X Axis</option>';
  yAxis.innerHTML = '<option value="">Select Y Axis</option>';

  headers.forEach(header => {
    xAxis.innerHTML += `<option value="${header}">${header}</option>`;
    yAxis.innerHTML += `<option value="${header}">${header}</option>`;
  });
}

function generateChart() {
  const chartType = document.getElementById('chartType').value;
  const xAxis = document.getElementById('xAxis').value;
  const yAxis = document.getElementById('yAxis').value;

  if (!xAxis || !yAxis) {
    showNotification('Please select both X and Y axes!', 'error');
    return;
  }

  const canvas = document.getElementById('dataChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (currentChart) {
    currentChart.destroy();
  }

  const chartData = prepareChartData(xAxis, yAxis, chartType);

  currentChart = new Chart(ctx, {
    type: chartType === 'scatter' ? 'scatter' : chartType,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `${yAxis} vs ${xAxis}`
        },
        legend: {
          display: chartType === 'pie'
        }
      },
      scales: chartType !== 'pie' ? {
        x: {
          display: true,
          title: {
            display: true,
            text: xAxis
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yAxis
          }
        }
      } : {}
    }
  });

  showNotification('Chart generated successfully!');
}

function prepareChartData(xAxis, yAxis, chartType) {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ];

  if (chartType === 'pie') {
    const groupedData = {};
    excelData.forEach(row => {
      const key = row[xAxis];
      const value = parseFloat(row[yAxis]) || 0;
      groupedData[key] = (groupedData[key] || 0) + value;
    });

    return {
      labels: Object.keys(groupedData),
      datasets: [{
        data: Object.values(groupedData),
        backgroundColor: colors
      }]
    };
  }

  if (chartType === 'scatter') {
    return {
      datasets: [{
        label: `${yAxis} vs ${xAxis}`,
        data: excelData.map(row => ({
          x: parseFloat(row[xAxis]) || 0,
          y: parseFloat(row[yAxis]) || 0
        })),
        backgroundColor: colors[0]
      }]
    };
  }

  // For bar and line charts
  const groupedData = {};
  excelData.forEach(row => {
    const key = row[xAxis];
    const value = parseFloat(row[yAxis]) || 0;
    if (groupedData[key]) {
      groupedData[key].push(value);
    } else {
      groupedData[key] = [value];
    }
  });

  // Calculate averages
  const labels = Object.keys(groupedData);
  const data = labels.map(label => {
    const values = groupedData[label];
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  return {
    labels,
    datasets: [{
      label: yAxis,
      data,
      backgroundColor: chartType === 'bar' ? colors[0] : 'transparent',
      borderColor: colors[0],
      borderWidth: 2,
      fill: false
    }]
  };
}

function downloadChart() {
  if (!currentChart) {
    showNotification('No chart to download!', 'error');
    return;
  }

  const canvas = document.getElementById('dataChart');
  if (!canvas) return;

  const image = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = image;
  link.download = 'chart.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Chart downloaded successfully!', 'success');
}

// ===================== MongoDB Export Simulation =====================
function exportToMongoDB() {
  if (!excelData) {
    showNotification('No data to export!', 'error');
    return;
  }

  showNotification('Exporting to MongoDB...');
  setTimeout(() => {
    showNotification('Data exported to MongoDB successfully!');
  }, 1500);
}

// ===================== Admin Functions =====================
function requestAdminRole() {
  if (!currentUser) return;
  if (adminRequests.find(req => req.userId === currentUser.id && req.status === 'pending')) {
    showNotification('Admin request already pending!', 'error');
    return;
  }

  const request = {
    id: 'request_' + Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    requestDate: new Date().toISOString(),
    status: 'pending'
  };

  adminRequests.push(request);
  localStorage.setItem('adminRequests', JSON.stringify(adminRequests));
  showNotification('Admin request submitted successfully!');

  const btn = document.getElementById('adminRequestBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Request Pending';
  }
}

function approveAdminRequest(requestId) {
  const request = adminRequests.find(req => req.id === requestId);
  if (!request) return;

  // Update user role to admin
  const user = users.find(u => u.id === request.userId);
  if (user) {
    user.role = 'admin';
    localStorage.setItem('users', JSON.stringify(users));
  }

  // Update request status
  request.status = 'approved';
  request.approvedDate = new Date().toISOString();
  localStorage.setItem('adminRequests', JSON.stringify(adminRequests));

  loadSuperAdminData();
  showNotification('Admin request approved successfully!');
}

function rejectAdminRequest(requestId) {
  const request = adminRequests.find(req => req.id === requestId);
  if (!request) return;

  request.status = 'rejected';
  request.rejectedDate = new Date().toISOString();
  localStorage.setItem('adminRequests', JSON.stringify(adminRequests));

  loadSuperAdminData();
  showNotification('Admin request rejected!');
}

// ===================== Data Loading =====================
function loadUserData() {
  if (!currentUser) return;
  // Load upload history
  const userUploads = uploads.filter(upload => upload.userId === currentUser.id);
  let historyHtml = '<table><thead><tr><th>File Name</th><th>Upload Date</th><th>Rows</th><th>Status</th></tr></thead><tbody>';

  if (userUploads.length === 0) {
    historyHtml += '<tr><td colspan="4" style="text-align: center;">No uploads yet</td></tr>';
  } else {
    userUploads.forEach(upload => {
      historyHtml += `
        <tr>
          <td>${upload.fileName}</td>
          <td>${new Date(upload.uploadDate).toLocaleDateString()}</td>
          <td>${upload.rowCount}</td>
          <td><span style="color: #28a745; font-weight: bold;">✓ Processed</span></td>
        </tr>
      `;
    });
  }
  historyHtml += '</tbody></table>';
  const uploadHistory = document.getElementById('uploadHistory');
  if (uploadHistory) uploadHistory.innerHTML = historyHtml;

  // Check if admin request is pending
  const pendingRequest = adminRequests.find(req => req.userId === currentUser.id && req.status === 'pending');
  const adminRequestBtn = document.getElementById('adminRequestBtn');
  if (pendingRequest && adminRequestBtn) {
    adminRequestBtn.disabled = true;
    adminRequestBtn.textContent = 'Request Pending';
  }
}

function loadAdminData() {
  // Load stats
  const totalUsersEl = document.getElementById('totalUsers');
  const totalUploadsEl = document.getElementById('totalUploads');
  const activeUsersEl = document.getElementById('activeUsers');
  if (totalUsersEl) totalUsersEl.textContent = users.filter(u => u.role === 'user').length;
  if (totalUploadsEl) totalUploadsEl.textContent = uploads.length;
  if (activeUsersEl) activeUsersEl.textContent = users.filter(u => u.role !== 'superadmin').length;

  // Load user management
  const regularUsers = users.filter(u => u.role === 'user');
  let userHtml = '<table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Uploads</th><th>Actions</th></tr></thead><tbody>';

  regularUsers.forEach(user => {
    const userUploadsCount = uploads.filter(u => u.userId === user.id).length;
    userHtml += `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>${userUploadsCount}</td>
        <td>
          <button class="btn btn-secondary" style="font-size: 12px; padding: 5px 10px;" onclick="viewUserDetails('${user.id}')">View</button>
        </td>
      </tr>
    `;
  });
  userHtml += '</tbody></table>';
  const userManagement = document.getElementById('userManagement');
  if (userManagement) userManagement.innerHTML = userHtml;

  // Load upload monitoring
  let uploadHtml = '<table><thead><tr><th>User</th><th>File Name</th><th>Upload Date</th><th>Size (Rows)</th><th>Status</th></tr></thead><tbody>';

  uploads.slice(-20).reverse().forEach(upload => {
    const user = users.find(u => u.id === upload.userId);
    uploadHtml += `
      <tr>
        <td>${user ? user.name : 'Unknown'}</td>
        <td>${upload.fileName}</td>
        <td>${new Date(upload.uploadDate).toLocaleString()}</td>
        <td>${upload.rowCount}</td>
        <td><span style="color: #28a745;">✓ Processed</span></td>
      </tr>
    `;
  });
  uploadHtml += '</tbody></table>';
  const uploadMonitoring = document.getElementById('uploadMonitoring');
  if (uploadMonitoring) uploadMonitoring.innerHTML = uploadHtml;
}

function loadSuperAdminData() {
  // Load stats
  const totalAdminsEl = document.getElementById('totalAdmins');
  const pendingRequestsEl = document.getElementById('pendingRequests');
  if (totalAdminsEl) totalAdminsEl.textContent = users.filter(u => u.role === 'admin').length;
  if (pendingRequestsEl) pendingRequestsEl.textContent = adminRequests.filter(req => req.status === 'pending').length;

  // Load admin requests
  const pendingRequests = adminRequests.filter(req => req.status === 'pending');
  let requestsHtml = '';

  if (pendingRequests.length === 0) {
    requestsHtml = '<p style="text-align: center; color: #666;">No pending admin requests</p>';
  } else {
    pendingRequests.forEach(request => {
      requestsHtml += `
        <div class="admin-request">
          <h4>${request.userName}</h4>
          <p><strong>Email:</strong> ${request.userEmail}</p>
          <p><strong>Request Date:</strong> ${new Date(request.requestDate).toLocaleString()}</p>
          <div style="margin-top: 15px;">
            <button class="btn btn-approve" onclick="approveAdminRequest('${request.id}')">Approve</button>
            <button class="btn btn-reject" onclick="rejectAdminRequest('${request.id}')">Reject</button>
          </div>
        </div>
      `;
    });
  }
  const adminRequestsEl = document.getElementById('adminRequests');
  if (adminRequestsEl) adminRequestsEl.innerHTML = requestsHtml;

  // Load all users
  let allUsersHtml = '<table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Uploads</th><th>Actions</th></tr></thead><tbody>';

  users.filter(u => u.role !== 'superadmin').forEach(user => {
    const userUploadsCount = uploads.filter(upl => upl.userId === user.id).length;
    allUsersHtml += `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td><span style="color: ${user.role === 'admin' ? '#ff6b6b' : '#667eea'}; font-weight: bold;">${user.role.toUpperCase()}</span></td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>${userUploadsCount}</td>
        <td>
          <button class="btn btn-secondary" style="font-size: 12px; padding: 5px 10px;" onclick="viewUserDetails('${user.id}')">View</button>
          ${user.role === 'admin' ? `<button class="btn" style="font-size: 12px; padding: 5px 10px; background: #dc3545; color: white;" onclick="demoteAdmin('${user.id}')">Demote</button>` : ''}
        </td>
      </tr>
    `;
  });
  allUsersHtml += '</tbody></table>';
  const allUsers = document.getElementById('allUsers');
  if (allUsers) allUsers.innerHTML = allUsersHtml;

  // Load system activity
  let activityHtml = '<table><thead><tr><th>Activity</th><th>User</th><th>Date</th><th>Details</th></tr></thead><tbody>';

  // Combine uploads and requests for activity feed
  const activities = [
    ...uploads.slice(-10).map(upload => ({
      type: 'upload',
      user: users.find(u => u.id === upload.userId)?.name || 'Unknown',
      date: upload.uploadDate,
      details: `Uploaded ${upload.fileName}`
    })),
    ...adminRequests.slice(-5).map(request => ({
      type: 'admin_request',
      user: request.userName,
      date: request.requestDate,
      details: `Requested admin role - Status: ${request.status}`
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);

  activities.forEach(activity => {
    activityHtml += `
      <tr>
        <td>
          <span style="color: ${activity.type === 'upload' ? '#28a745' : '#ff6b6b'};">
            ${activity.type === 'upload' ? '📊 File Upload' : '👤 Admin Request'}
          </span>
        </td>
        <td>${activity.user}</td>
        <td>${new Date(activity.date).toLocaleString()}</td>
        <td>${activity.details}</td>
      </tr>
    `;
  });
  activityHtml += '</tbody></table>';
  const systemActivity = document.getElementById('systemActivity');
  if (systemActivity) systemActivity.innerHTML = activityHtml;
}

// ===================== Other Actions =====================
function viewUserDetails(userId) {
  const user = users.find(u => u.id === userId);
  const userUploads = uploads.filter(u => u.userId === userId);
  if (!user) return;

  alert(`User Details:\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nJoined: ${new Date(user.createdAt).toLocaleString()}\nTotal Uploads: ${userUploads.length}\n\nRecent Uploads:\n${userUploads.slice(-5).map(u => `- ${u.fileName} (${new Date(u.uploadDate).toLocaleDateString()})`).join('\n')}`);
}

function demoteAdmin(userId) {
  if (confirm('Are you sure you want to demote this admin to regular user?')) {
    const user = users.find(u => u.id === userId);
    if (user) {
      user.role = 'user';
      localStorage.setItem('users', JSON.stringify(users));
      loadSuperAdminData();
      showNotification('Admin demoted successfully!');
    }
  }
}

// ===================== Session Management =====================
function saveCurrentUser() {
  if (currentUser) {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
}

function clearCurrentUser() {
  localStorage.removeItem('currentUser');
}

function logout() {
  currentUser = null;
  clearCurrentUser();
  const userInfo = document.getElementById('userInfo');
  if (userInfo) userInfo.textContent = '';
  showPage('welcomePage');
  showNotification('Logged out successfully!');

  // Reset all forms
  ['userLoginForm', 'userSignupForm', 'adminLoginForm', 'superAdminLoginForm'].forEach(formId => {
    const form = document.getElementById(formId);
    if (form) form.reset();
  });

  // Clear chart
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  // Hide sections
  ['chartSection', 'dataPreview'].forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) element.style.display = 'none';
  });
}

// ===================== Initialize App =====================
document.addEventListener('DOMContentLoaded', function () {
  // Check if user is already logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }

  if (currentUser) {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.textContent = `Welcome, ${currentUser.name}`;

    if (currentUser.role === 'superadmin') {
      showPage('superAdminDashboard');
      loadSuperAdminData();
    } else if (currentUser.role === 'admin') {
      showPage('adminDashboard');
      loadAdminData();
    } else {
      showPage('userDashboard');
      loadUserData();
    }
  } else {
    showWelcome();
  }
});
function downloadChartAsPDF() {
  const chartContainer = document.getElementById('chartSection');
  if (!chartContainer) {
    showNotification('Chart not found!', 'error');
    return;
  }

  // Use html2canvas to render the entire chart container as an image
  html2canvas(chartContainer, {
    scale: 2, // Improves resolution of the final image
    useCORS: true // Required for images from other domains if any exist
  }).then(canvas => {
    // Initialize a new jsPDF instance
    const {
      jsPDF
    } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Add the image to the PDF
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // Save the PDF file
    pdf.save('excel_analyzer_chart.pdf');
    showNotification('Chart downloaded successfully!', 'success');
  }).catch(error => {
    console.error("Error generating PDF:", error);
    showNotification('Failed to download chart. Please try again.', 'error');
  });
}
