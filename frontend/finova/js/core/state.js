/**
 * State Management - Central app state
 */

// Global app state
const appData = {
    // Current user
    currentUser: null,

    // Core data
    employees: [],
    departments: [],
    positions: [],

    // Leave requests
    leaveRequests: [],

    // Attendance
    attendance: [],
    attendanceStats: [],
    attendanceDate: new Date().toISOString().split('T')[0],
    attendanceDeptId: '',
    attendancePosId: '',
    attendanceDeptName: '',
    attendancePosName: '',
    includeAbsent: false,
    showOnlyAbsent: false,
    attendanceFilterType: 'daily', // 'daily', 'monthly', or 'range'
    attendanceMonth: new Date().toISOString().slice(0, 7),
    attendanceStartDate: new Date().toISOString().split('T')[0],
    attendanceEndDate: new Date().toISOString().split('T')[0],
    attendanceEmployeeId: null,

    // Performance
    performance: [],
    performanceKPIs: [],
    performanceReviews: [],
    performanceViewType: 'my', // 'my' or 'team'
    performanceReviewCycle: 'Q4 2024',

    // Salary/Payroll
    salaries: [],
    salaryRequests: [],

    // Announcements
    announcements: [],

    // Meta state
    isInitialLoading: false
};

// UI state
let currentPage = 'dashboard';
let nextId = {
    employees: 6,
    leaveRequests: 5,
    attendance: 6,
    performance: 5
};

// Pagination state
let currentEmployeePage = 1;

/**
 * Get entire app state
 */
export function getState() {
    return appData;
}

/**
 * Get specific state property
 */
export function get(key) {
    return appData[key];
}

/**
 * Set specific state property
 */
export function set(key, value) {
    appData[key] = value;
}

/**
 * Update multiple state properties
 */
export function update(obj) {
    Object.assign(appData, obj);
}

/**
 * Get current page
 */
export function getCurrentPage() {
    return currentPage;
}

/**
 * Set current page
 */
export function setCurrentPage(page) {
    currentPage = page;
}

/**
 * Get pagination state
 */
export function getPagination() {
    return {
        currentPage: currentEmployeePage,
        nextId
    };
}

/**
 * Set pagination
 */
export function setEmployeePage(page) {
    currentEmployeePage = page;
}

/**
 * Initialize state (called on app load)
 */
export function initState() {
    console.log('[State] Initialized');
}

/**
 * Reset state (for logout)
 */
export function resetState() {
    Object.keys(appData).forEach(key => {
        if (Array.isArray(appData[key])) {
            appData[key] = [];
        } else if (typeof appData[key] === 'object' && appData[key] !== null) {
            appData[key] = null;
        }
    });

    currentPage = 'dashboard';
    currentEmployeePage = 1;
}
