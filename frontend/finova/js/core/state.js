/**
 * Quản lý State - Trạng thái ứng dụng tập trung
 */

// Dữ liệu app toàn cục
const appData = {
    // User hiện tại
    currentUser: null,

    // Dữ liệu cơ bản
    employees: [],
    departments: [],
    positions: [],

    // Đơn nghỉ phép
    leaveRequests: [],

    // Chấm công
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

    // Lương/Bảng lương
    salaries: [],
    salaryRequests: [],

    // Thông báo
    announcements: [],

    // Meta state
    isInitialLoading: false
};

// Trạng thái UI
let currentPage = 'dashboard';
let nextId = {
    employees: 6,
    leaveRequests: 5,
    attendance: 6,
    performance: 5
};

// Trạng thái phân trang
let currentEmployeePage = 1;

/**
 * Lấy toàn bộ app state
 */
export function getState() {
    return appData;
}

/**
 * Lấy một thuộc tính cụ thể của state
 */
export function get(key) {
    return appData[key];
}

/**
 * Thiết lập một thuộc tính cụ thể của state
 */
export function set(key, value) {
    appData[key] = value;
}

/**
 * Cập nhật nhiều thuộc tính state
 */
export function update(obj) {
    Object.assign(appData, obj);
}

/**
 * Lấy trang hiện tại
 */
export function getCurrentPage() {
    return currentPage;
}

/**
 * Thiết lập trang hiện tại
 */
export function setCurrentPage(page) {
    currentPage = page;
}

/**
 * Lấy trạng thái phân trang
 */
export function getPagination() {
    return {
        currentPage: currentEmployeePage,
        nextId
    };
}

/**
 * Thiết lập phân trang
 */
export function setEmployeePage(page) {
    currentEmployeePage = page;
}

/**
 * Khởi tạo state (gọi khi app load)
 */
export function initState() {
    console.log('[State] Initialized');
}

/**
 * Reset state (dùng khi logout)
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
