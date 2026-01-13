/**
 * Cấu hình - API URLs và Constants
 */

// API Base URL
export const API_BASE_URL = 'http://127.0.0.1:8000'; // ← Cập nhật sang port 8000

// Phân trang
export const ITEMS_PER_PAGE = 20;

// Các chức vụ lãnh đạo
export const LEADERSHIP_POSITIONS = [
    "Chairman of Members' Council",
    "Full-time Council Member",
    "Council Member - General Director",
    "Deputy General Director",
    "Chief Accountant",
    "Chief of Office",
    "Deputy Chief of Office",
    "Deputy Chief of Office - HR Manager",
    "Main Unit Team Leader",
    "Deputy Team Leader",
    "Head of Monitoring Office",
    "Deputy Head of Monitoring Office",
    "Main Office Team Leader"
];

// Các chức vụ chung
export const GENERAL_POSITIONS = [
    "Specialist",
    "Senior Specialist",
    "Engineer",
    "Employee",
    "Driver",
    "Treasurer",
    "Specialist, VT",
    "Specialist, Clerk"
];

// Các phòng ban
export const GENERAL_DEPTS = [
    "Administration Department",
    "Appraisal Department",
    "Board of Directors",
    "CGNB Monitoring Office",
    "Construction & Site Management",
    "Construction Investment Department",
    "DN-QN Monitoring Office",
    "Finance - Accounting Department",
    "HLD Monitoring Office",
    "HR Department",
    "Main Office",
    "Management & Operation Department",
    "NBLC Monitoring Office",
    "Office",
    "Party Office",
    "Planning & Finance Department",
    "Research & Development Center",
    "Tender Department",
    "Tender Expert Group"
];

// Usernames Hội đồng cốt lõi (loại trừ khỏi theo dõi chấm công)
export const CORE_COUNCIL_USERNAMES = [
    "truong1979746",
    "tran1975778",
    "pham1973439",
    "le1984949"
];

// Lịch làm việc
export const WORK_SCHEDULE = {
    shiftStart: "08:30",
    shiftEnd: "17:30",
    otStart: "18:00",
    otEnd: "21:00"
};
