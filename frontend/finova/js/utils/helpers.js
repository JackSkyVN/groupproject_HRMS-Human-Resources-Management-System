/**
 * Tiện ích Hỗ trợ
 */

/**
 * Kiểm soát Truy cập Dựa trên Role: Helper để xác định department có được quản lý bởi position HR Staff hay không
 */
export function isDepartmentManagedByPosition(deptName, positionName) {
    const pos = String(positionName || '').toLowerCase();
    const dept = String(deptName || '').toLowerCase();

    if (pos.includes('hr handles it') || pos.includes('hr manages it')) {
        return dept.includes('it department');
    }
    if (pos.includes('hr handles finance') || pos.includes('hr manages finance')) {
        return dept.includes('finance') || dept.includes('internal control') || dept.includes('accounting') || dept.includes('land and financial');
    }
    if (pos.includes('hr handles construction') || pos.includes('hr manages construction')) {
        return dept.includes('construction') || dept.includes('tender') || dept.includes('field office') || dept.includes('monitoring office');
    }
    if (pos.includes('hr handles administration') || pos.includes('hr manages administration')) {
        return dept.includes('administration') || dept.includes('office') || dept.includes('director') || dept.includes('council') || dept.includes('legal') || dept.includes('risk') || dept.includes('appraisal');
    }
    if (pos.includes('hr handles support') || pos.includes('hr manages support') || pos.includes('hr manages other')) {
        return dept.includes('research') || dept.includes('operation') || dept.includes('cgnb monitoring');
    }
    return false;
}

import { getState } from '../core/state.js';

/**
 * Lấy nhóm nhân viên được quản lý dựa trên hệ thống phân cấp role
 */
export function getManagedEmployeePool() {
    const appData = getState();
    const userEmail = appData.currentUser?.email || "";
    const userRole = appData.currentUser?.profile?.position_name || "";
    const currentUserId = appData.currentUser?.profile?.user_id || null;

    const isHRDirector = userEmail.startsWith("ha1972816");
    const isHRStaff = userRole === "HR Staff";
    const isAdmin = userEmail.startsWith("to1979714");

    const leadershipKeywords = [
        "Director", "Chief", "Head", "Chairman", "Leader",
        "Giám đốc", "Trưởng", "Phó", "Chủ tịch", "General Director",
        "Chánh", "Chỉ huy", "Lãnh đạo", "Acting"
    ];

    if (isAdmin) {
        return appData.employees;
    }

    if (isHRDirector) {
        const hrStaffUserIds = appData.employees
            .filter(e => e.position === "HR Staff" || (e.department === "HR Department" && e.position !== "HR Director"))
            .map(e => e.user_id)
            .filter(id => id != null);

        return appData.employees.filter(e => {
            if (e.department === "Members' Council") return false;
            if (e.email === "to1979714@finova.vn") return true;

            if (e.created_by_id) {
                if (e.created_by_id === currentUserId) return true;
                if (hrStaffUserIds.includes(e.created_by_id)) return true;
                return false;
            }

            const isLeadership = leadershipKeywords.some(k => (e.position || "").toLowerCase().includes(k.toLowerCase()));
            const isHR = e.department === "HR Department" || e.position === "HR Staff";
            const isIT = e.department === "IT Department";

            return (isLeadership || isHR) && !isIT;
        });
    }

    if (isHRStaff) {
        return appData.employees.filter(e => {
            const isCouncil = e.department === "Members' Council";
            if (isCouncil) return false;

            if (String(e.id) === String(appData.currentUser?.profile?.id)) return true;

            const isLeadership = leadershipKeywords.some(k => (e.position || "").toLowerCase().includes(k.toLowerCase()));
            return !isLeadership;
        });
    }

    return appData.employees;
}

/**
 * Định dạng ngày
 */
export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
}

/**
 * Định dạng tiền tệ
 */
export function formatCurrency(amount) {
    if (!amount) return '$0';
    return `$${amount.toLocaleString()}`;
}

/**
 * Xác thực form
 */
export function validateForm(form) {
    const inputs = form.querySelectorAll('[required]');
    for (const input of inputs) {
        if (!input.value.trim()) {
            input.focus();
            return false;
        }
    }
    return true;
}

/**
 * Hàm Debounce
 */
export function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Hiển thị getManagedEmployeePool global cho onclick handlers
window.getManagedEmployeePool = getManagedEmployeePool;

/**
 * Format date from YYYY-MM-DD to DD/MM/YYYY (Vietnamese format)
 */
export function formatDateToDDMMYYYY(dateStr) {
    if (!dateStr || dateStr === 'N/A') return dateStr;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return dateStr;
}
