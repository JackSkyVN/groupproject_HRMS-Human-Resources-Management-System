/**
 * Helper Utilities
 */

import { getState } from '../core/state.js';

/**
 * Get managed employee pool based on role hierarchy
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
 * Format date
 */
export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
    if (!amount) return '$0';
    return `$${amount.toLocaleString()}`;
}

/**
 * Validate form
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
 * Debounce function
 */
export function debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Make getManagedEmployeePool available globally for onclick handlers
window.getManagedEmployeePool = getManagedEmployeePool;
