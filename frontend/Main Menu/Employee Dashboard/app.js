// Backend Configuration
const API_BASE_URL = 'http://127.0.0.1:8000';

// State Management
let currentView = 'chat';
let currentChannel = 'general';
let isClocked = false;
let clockStartTime = null;
let timerInterval = null;

// Profile Data (will be loaded from backend)
let profile = {
    name: 'Loading...',
    email: '',
    phone: '',
    department: '',
    position: ''
};

// Data arrays (will be populated from backend)
let messages = [];
let announcements = [];
let assignments = [];
let timeEntries = [];
let payrollHistory = [];

// Authentication Check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../Login screen/index.html';
        return false;
    }
    return true;
}

// Load data from backend
async function loadBackendData() {
    const token = localStorage.getItem('token');
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        // Load current user profile
        const meRes = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { headers });
        if (meRes.ok) {
            const user = await meRes.json();

            // Get employee profile
            const profileRes = await fetch(`${API_BASE_URL}/api/v1/employees/me`, { headers });
            if (profileRes.ok) {
                const empProfile = await profileRes.json();
                profile = {
                    name: empProfile.full_name || user.email,
                    email: empProfile.email || user.email,
                    phone: empProfile.phone || 'N/A',
                    department: empProfile.department_name || 'N/A',
                    position: empProfile.position_name || 'Employee'
                };

                // Update UI with real profile
                updateProfileUI();
            }
        }

        // Load announcements
        const announcementsRes = await fetch(`${API_BASE_URL}/api/v1/announcements`, { headers });
        if (announcementsRes.ok) {
            const backendAnnouncements = await announcementsRes.json();
            announcements = backendAnnouncements.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content || a.message || '',
                author: 'Management',
                date: a.created_at ? a.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                priority: 'medium',
                pinned: false
            }));
            renderAnnouncements();
        }

        // Load attendance (time entries)
        const attendanceRes = await fetch(`${API_BASE_URL}/api/v1/attendance`, { headers });
        if (attendanceRes.ok) {
            const attendanceData = await attendanceRes.json();
            const items = attendanceData.items || [];

            timeEntries = items.slice(0, 10).map(a => ({
                id: a.id,
                date: a.date,
                clockIn: a.check_in_time || 'N/A',
                clockOut: a.check_out_time || 'N/A',
                totalHours: calculateHours(a.check_in_time, a.check_out_time),
                status: 'completed'
            }));
            renderTimeEntries();
        }

        // Mock data for features not yet in backend
        messages = [
            { id: 1, user: 'System', avatar: 'SY', content: 'Welcome to the team chat!', timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
        ];

        assignments = [
            {
                id: 1,
                title: 'Review Backend Integration',
                description: 'Check the new Employee Dashboard backend connection.',
                assignedBy: 'HR Department',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'pending',
                priority: 'high'
            }
        ];

    } catch (error) {
        console.error('Error loading backend data:', error);
    }
}

function calculateHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    try {
        const [h1, m1] = checkIn.split(':').map(Number);
        const [h2, m2] = checkOut.split(':').map(Number);
        const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        return Math.round((totalMinutes / 60) * 10) / 10;
    } catch {
        return 0;
    }
}

function updateProfileUI() {
    const initials = profile.name.split(' ').map(n => n[0]).join('');
    document.querySelectorAll('.user-avatar, .profile-avatar-large').forEach(el => {
        el.textContent = initials;
    });
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    if (userName) userName.textContent = profile.name;
    if (userRole) userRole.textContent = profile.position;
}

// Initialize App
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication first
    if (!checkAuth()) return;

    // Load backend data
    await loadBackendData();

    // Initialize UI components
    initNavigation();
    initChat();
    initAnnouncements();
    initAssignments();
    initTimeTracking();
    initPayroll();
    initProfileSettings();

    // Render initial view
    renderMessages();
});

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
}

function switchView(view) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === view) {
            item.classList.add('active');
        }
    });

    // Update views
    document.querySelectorAll('.view-container').forEach(container => {
        container.classList.remove('active');
    });
    document.getElementById(view + 'View').classList.add('active');

    currentView = view;
}

// Team Chat
function initChat() {
    const channelItems = document.querySelectorAll('.channel-item');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');

    channelItems.forEach(item => {
        item.addEventListener('click', function () {
            const channel = this.getAttribute('data-channel');
            switchChannel(channel);
        });
    });

    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function switchChannel(channel) {
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-channel') === channel) {
            item.classList.add('active');
        }
    });

    currentChannel = channel;
    document.getElementById('currentChannel').textContent = channel;
}

function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = messages.map(msg => `
        <div class="message">
            <div class="message-avatar">${msg.avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-user">${msg.user}</span>
                    <span class="message-time">${msg.timestamp}</span>
                </div>
                <p class="message-text">${msg.content}</p>
            </div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const newMessage = {
        id: messages.length + 1,
        user: profile.name,
        avatar: profile.name.split(' ').map(n => n[0]).join(''),
        content: content,
        timestamp: timestamp
    };

    messages.push(newMessage);
    input.value = '';
    renderMessages();
}

// Announcements
function initAnnouncements() {
    renderAnnouncements();
}

function renderAnnouncements() {
    const container = document.getElementById('announcementsList');
    const pinnedAnnouncements = announcements.filter(a => a.pinned);
    const regularAnnouncements = announcements.filter(a => !a.pinned);

    let html = '';

    if (pinnedAnnouncements.length > 0) {
        html += '<h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;"><svg class="icon" style="width: 20px; height: 20px; color: #2563eb;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> Pinned Announcements</h3>';
        html += pinnedAnnouncements.map(announcement => createAnnouncementHTML(announcement)).join('');
    }

    if (regularAnnouncements.length > 0) {
        html += '<h3 style="margin: 24px 0 16px;">Recent Announcements</h3>';
        html += regularAnnouncements.map(announcement => createAnnouncementHTML(announcement)).join('');
    }

    container.innerHTML = html;
}

function createAnnouncementHTML(announcement) {
    const priorityClass = `badge-${announcement.priority}`;
    const date = new Date(announcement.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return `
        <div class="announcement-card">
            <div class="announcement-header">
                <div>
                    <div class="announcement-title">${announcement.title}</div>
                    <div class="announcement-meta">
                        <span>${announcement.author}</span>
                        <span>•</span>
                        <span>${date}</span>
                    </div>
                </div>
                <span class="badge ${priorityClass}">${announcement.priority}</span>
            </div>
            <p class="announcement-body">${announcement.content}</p>
        </div>
    `;
}

// Work Assignments
function initAssignments() {
    const tabs = document.querySelectorAll('.tab-btn');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            const status = this.getAttribute('data-status');

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            renderAssignments(status);
        });
    });

    renderAssignments('all');
}

function renderAssignments(status) {
    const container = document.getElementById('assignmentsList');
    let filteredAssignments = assignments;

    if (status !== 'all') {
        filteredAssignments = assignments.filter(a => a.status === status);
    }

    container.innerHTML = filteredAssignments.map(assignment => createAssignmentHTML(assignment)).join('');

    // Add event listeners to status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const assignmentId = parseInt(this.getAttribute('data-id'));
            const newStatus = this.getAttribute('data-status');
            updateAssignmentStatus(assignmentId, newStatus);
        });
    });
}

function createAssignmentHTML(assignment) {
    const priorityClass = `badge-${assignment.priority}`;
    const date = new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let statusIcon = '';
    if (assignment.status === 'completed') {
        statusIcon = '<svg class="assignment-status-icon" style="color: #16a34a;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (assignment.status === 'in-progress') {
        statusIcon = '<svg class="assignment-status-icon" style="color: #2563eb;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    } else {
        statusIcon = '<svg class="assignment-status-icon" style="color: #94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
    }

    return `
        <div class="assignment-card">
            <div class="assignment-header">
                ${statusIcon}
                <div class="assignment-info">
                    <div class="assignment-title">${assignment.title}</div>
                    <p class="assignment-description">${assignment.description}</p>
                    <div class="assignment-meta">
                        <span>Assigned by: ${assignment.assignedBy}</span>
                        <span>Due: ${date}</span>
                    </div>
                </div>
                <span class="badge ${priorityClass}">${assignment.priority}</span>
            </div>
            <div class="assignment-actions">
                <button class="btn btn-sm btn-outline status-btn ${assignment.status === 'pending' ? 'btn-primary' : ''}" data-id="${assignment.id}" data-status="pending">Pending</button>
                <button class="btn btn-sm btn-outline status-btn ${assignment.status === 'in-progress' ? 'btn-primary' : ''}" data-id="${assignment.id}" data-status="in-progress">In Progress</button>
                <button class="btn btn-sm btn-outline status-btn ${assignment.status === 'completed' ? 'btn-primary' : ''}" data-id="${assignment.id}" data-status="completed">Completed</button>
            </div>
        </div>
    `;
}

function updateAssignmentStatus(id, status) {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
        assignment.status = status;
        renderAssignments('all');
    }
}

// Time Tracking
function initTimeTracking() {
    const clockBtn = document.getElementById('clockToggleBtn');

    clockBtn.addEventListener('click', toggleClock);

    renderTimeEntries();
}

function toggleClock() {
    const btn = document.getElementById('clockToggleBtn');
    const statusText = document.getElementById('timeStatus');
    const startText = document.getElementById('timeStart');

    if (!isClocked) {
        // Clock in - call backend API
        clockIn();
    } else {
        // Clock out - call backend API
        clockOut();
    }
}

async function clockIn() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('clockToggleBtn');
    const statusText = document.getElementById('timeStatus');
    const startText = document.getElementById('timeStart');

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/attendance/checkin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            isClocked = true;
            clockStartTime = new Date();

            btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Clock Out';
            btn.classList.add('clocked-in');

            statusText.textContent = 'Currently clocked in';
            startText.textContent = 'Started at ' + clockStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            // Start timer
            timerInterval = setInterval(updateTimer, 1000);
        } else {
            alert('Failed to clock in. Please try again.');
        }
    } catch (error) {
        console.error('Clock in error:', error);
        alert('Error clocking in. Please check your connection.');
    }
}

async function clockOut() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('clockToggleBtn');
    const statusText = document.getElementById('timeStatus');
    const startText = document.getElementById('timeStart');

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/attendance/checkout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            isClocked = false;

            btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Clock In';
            btn.classList.remove('clocked-in');

            statusText.textContent = 'Not clocked in';
            startText.textContent = '';
            document.getElementById('currentTime').textContent = '00:00:00';

            clearInterval(timerInterval);

            // Reload attendance data
            await loadBackendData();
        } else {
            alert('Failed to clock out. Please try again.');
        }
    } catch (error) {
        console.error('Clock out error:', error);
        alert('Error clocking out. Please check your connection.');
    }
}

function updateTimer() {
    if (!isClocked || !clockStartTime) return;

    const now = new Date();
    const diff = now - clockStartTime;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeString =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');

    document.getElementById('currentTime').textContent = timeString;
}

function renderTimeEntries() {
    const container = document.getElementById('timeEntriesList');

    container.innerHTML = timeEntries.map(entry => {
        const date = new Date(entry.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
            <div class="time-entry">
                <div class="time-entry-info">
                    <svg class="icon" style="color: #94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <div>
                        <div class="time-entry-date">${date}</div>
                        <div class="time-entry-time">${entry.clockIn} - ${entry.clockOut}</div>
                    </div>
                </div>
                <div class="time-entry-hours">${entry.totalHours}h</div>
            </div>
        `;
    }).join('');
}

// Payroll
function initPayroll() {
    renderPayrollHistory();
}

function renderPayrollHistory() {
    const container = document.getElementById('payrollHistoryList');

    container.innerHTML = payrollHistory.map(entry => {
        const paymentDate = new Date(entry.paymentDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        return `
            <div class="payroll-entry">
                <div class="payroll-entry-header">
                    <div>
                        <div class="payroll-entry-period">${entry.period}</div>
                        <div class="payroll-entry-date">Payment: ${paymentDate}</div>
                    </div>
                    <span class="badge badge-${entry.status}">${entry.status}</span>
                </div>
                <div class="payroll-entry-details">
                    <div class="payroll-detail">
                        <p class="label">Hours</p>
                        <p>${entry.hoursWorked}h</p>
                    </div>
                    <div class="payroll-detail">
                        <p class="label">Gross Pay</p>
                        <p>$${entry.grossPay.toLocaleString()}</p>
                    </div>
                    <div class="payroll-detail">
                        <p class="label">Deductions</p>
                        <p class="highlight-red">-$${entry.deductions.toLocaleString()}</p>
                    </div>
                    <div class="payroll-detail">
                        <p class="label">Net Pay</p>
                        <p class="highlight-green">$${entry.netPay.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Profile Settings
function initProfileSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const modal = document.getElementById('settingsModal');

    settingsBtn.addEventListener('click', function () {
        modal.classList.add('active');
        loadProfileData();
    });

    closeBtn.addEventListener('click', function () {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    saveBtn.addEventListener('click', saveProfile);
}

function loadProfileData() {
    document.getElementById('profileName').value = profile.name;
    document.getElementById('profileEmail').value = profile.email;
    document.getElementById('profilePhone').value = profile.phone;
    document.getElementById('profileDepartment').value = profile.department;
    document.getElementById('profilePosition').value = profile.position;
}

function saveProfile() {
    profile.name = document.getElementById('profileName').value;
    profile.email = document.getElementById('profileEmail').value;
    profile.phone = document.getElementById('profilePhone').value;
    profile.department = document.getElementById('profileDepartment').value;
    profile.position = document.getElementById('profilePosition').value;

    // Update UI
    const initials = profile.name.split(' ').map(n => n[0]).join('');
    document.querySelectorAll('.user-avatar, .profile-avatar-large').forEach(el => {
        el.textContent = initials;
    });
    document.querySelector('.user-name').textContent = profile.name;
    document.querySelector('.user-role').textContent = profile.position;

    // Close modal
    document.getElementById('settingsModal').classList.remove('active');
}
