// State Management
let currentView = 'chat';
let currentChannel = 'general';
let isClocked = false;
let clockStartTime = null;
let timerInterval = null;

// Profile Data
let profile = {
    name: 'John Doe',
    email: 'john.doe@company.com',
    phone: '+1 (555) 123-4456',
    department: 'Engineering',
    position: 'Software Engineer'
};

// Sample Data
let messages = [
    { id: 1, user: 'Sarah Miller', avatar: 'SM', content: 'Hey team! Just finished the Q4 report. Anyone wants to review?', timestamp: '10:30 AM' },
    { id: 2, user: 'Mike Johnson', avatar: 'MJ', content: 'I can take a look! Send it over.', timestamp: '10:32 AM' },
    { id: 3, user: 'Emma Davis', avatar: 'ED', content: 'Great work Sarah! I\'ll review it as well.', timestamp: '10:35 AM' },
    { id: 4, user: 'John Doe', avatar: 'JD', content: 'Thanks everyone! Collaboration makes us stronger 💪', timestamp: '10:40 AM' }
];

let announcements = [
    {
        id: 1,
        title: 'Company-Wide Meeting - Q1 2024 Results',
        content: 'Join us this Friday at 2 PM for our quarterly review meeting. We\'ll discuss achievements, challenges, and goals for Q2.',
        author: 'Management Team',
        date: '2024-01-15',
        priority: 'high',
        pinned: true
    },
    {
        id: 2,
        title: 'New Employee Benefits Package',
        content: 'We\'re excited to announce enhanced health insurance coverage and additional PTO days starting next month.',
        author: 'HR Department',
        date: '2024-01-14',
        priority: 'high',
        pinned: true
    },
    {
        id: 3,
        title: 'Office Renovation Schedule',
        content: 'The 3rd floor will undergo renovation from Jan 20-27. Affected teams will work remotely during this period.',
        author: 'Facilities',
        date: '2024-01-12',
        priority: 'medium',
        pinned: false
    }
];

let assignments = [
    {
        id: 1,
        title: 'Update Q1 Financial Report',
        description: 'Review and update the Q1 financial report with latest data from accounting.',
        assignedBy: 'Sarah Miller',
        dueDate: '2024-01-20',
        status: 'in-progress',
        priority: 'high'
    },
    {
        id: 2,
        title: 'Prepare Client Presentation',
        description: 'Create presentation slides for the Anderson Corp client meeting next week.',
        assignedBy: 'Mike Johnson',
        dueDate: '2024-01-18',
        status: 'in-progress',
        priority: 'high'
    },
    {
        id: 3,
        title: 'Code Review - Feature Branch',
        description: 'Review the authentication feature implementation in the dev branch.',
        assignedBy: 'Emma Davis',
        dueDate: '2024-01-17',
        status: 'pending',
        priority: 'medium'
    },
    {
        id: 4,
        title: 'Update Employee Handbook',
        description: 'Add new remote work policies to the employee handbook.',
        assignedBy: 'HR Department',
        dueDate: '2024-01-15',
        status: 'completed',
        priority: 'low'
    }
];

let timeEntries = [
    { id: 1, date: '2024-01-15', clockIn: '09:00 AM', clockOut: '05:30 PM', totalHours: 8.5, status: 'completed' },
    { id: 2, date: '2024-01-14', clockIn: '09:15 AM', clockOut: '05:45 PM', totalHours: 8.5, status: 'completed' },
    { id: 3, date: '2024-01-13', clockIn: '08:45 AM', clockOut: '05:15 PM', totalHours: 8.5, status: 'completed' },
    { id: 4, date: '2024-01-12', clockIn: '09:00 AM', clockOut: '06:00 PM', totalHours: 9, status: 'completed' },
    { id: 5, date: '2024-01-11', clockIn: '09:30 AM', clockOut: '05:30 PM', totalHours: 8, status: 'completed' }
];

let payrollHistory = [
    {
        id: 1,
        period: 'December 16-31, 2023',
        startDate: '2023-12-16',
        endDate: '2023-12-31',
        hoursWorked: 85,
        grossPay: 2975,
        deductions: 595,
        netPay: 2380,
        status: 'paid',
        paymentDate: '2024-01-05'
    },
    {
        id: 2,
        period: 'December 1-15, 2023',
        startDate: '2023-12-01',
        endDate: '2023-12-15',
        hoursWorked: 80,
        grossPay: 2800,
        deductions: 560,
        netPay: 2240,
        status: 'paid',
        paymentDate: '2023-12-20'
    },
    {
        id: 3,
        period: 'November 16-30, 2023',
        startDate: '2023-11-16',
        endDate: '2023-11-30',
        hoursWorked: 88,
        grossPay: 3080,
        deductions: 616,
        netPay: 2464,
        status: 'paid',
        paymentDate: '2023-12-05'
    }
];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
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
        item.addEventListener('click', function() {
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
        item.addEventListener('click', function() {
            const channel = this.getAttribute('data-channel');
            switchChannel(channel);
        });
    });
    
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
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
        tab.addEventListener('click', function() {
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
        btn.addEventListener('click', function() {
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
        // Clock in
        isClocked = true;
        clockStartTime = new Date();
        
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Clock Out';
        btn.classList.add('clocked-in');
        
        statusText.textContent = 'Currently clocked in';
        startText.textContent = 'Started at ' + clockStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        // Start timer
        timerInterval = setInterval(updateTimer, 1000);
    } else {
        // Clock out
        isClocked = false;
        
        const clockOutTime = new Date();
        const diff = clockOutTime - clockStartTime;
        const hours = Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
        
        // Add entry
        const newEntry = {
            id: timeEntries.length + 1,
            date: clockStartTime.toISOString().split('T')[0],
            clockIn: clockStartTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            clockOut: clockOutTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            totalHours: hours,
            status: 'completed'
        };
        
        timeEntries.unshift(newEntry);
        
        btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Clock In';
        btn.classList.remove('clocked-in');
        
        statusText.textContent = 'Not clocked in';
        startText.textContent = '';
        document.getElementById('currentTime').textContent = '00:00:00';
        
        clearInterval(timerInterval);
        
        renderTimeEntries();
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
    
    settingsBtn.addEventListener('click', function() {
        modal.classList.add('active');
        loadProfileData();
    });
    
    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });
    
    modal.addEventListener('click', function(e) {
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
