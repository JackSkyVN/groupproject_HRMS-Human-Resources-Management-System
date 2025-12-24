/**
 * Attendance Module - Log and History
 */

import { getState } from '../core/state.js';
import { showToast } from '../utils/toast.js';

export function renderAttendance(mode = 'my') {
    const title = mode === 'my' ? 'My Attendance History' : 'Staff Attendance History';

    return `
        <div class="page-header">
            <h1>${title}</h1>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Attendance Logs</h2>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            ${mode === 'team' ? '<th>Employee</th>' : ''}
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Work Hours</th>
                            <th>Late (Min)</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="attendance-table-body">
                        ${renderAttendanceRows(mode)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAttendanceRows(mode) {
    const appData = getState();
    let records = appData.attendance || [];

    if (mode === 'my') {
        records = records.filter(a => a.employeeId === appData.currentUser?.id);
    }

    if (records.length === 0) {
        const colspan = mode === 'team' ? 7 : 6;
        return `<tr><td colspan="${colspan}" style="text-align: center; padding: 40px;">No attendance records found</td></tr>`;
    }

    return records.map(att => {
        const badgeClass = att.status === 'present' ? 'success' :
            att.status === 'late' ? 'warning' :
                att.status === 'absent' ? 'danger' : 'info';

        const statusMap = {
            'present': 'On Time',
            'late': 'Late',
            'absent': 'Absent'
        };

        const statusText = statusMap[att.status] || att.status;

        return `
            <tr>
                ${mode === 'team' ? `<td><strong>${att.employeeName}</strong></td>` : ''}
                <td>${att.date}</td>
                <td>${att.checkIn || '-'}</td>
                <td>${att.checkOut || '-'}</td>
                <td>${att.workHours ? att.workHours + ' h' : '-'}</td>
                <td>${att.lateMinutes > 0 ? `<span style="color: #ef4444;">${att.lateMinutes} min</span>` : '-'}</td>
                <td><span class="badge badge-${badgeClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}
