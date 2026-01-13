/**
 * Module Gate Monitoring - Theo dõi ra/vào cổng với Face Recognition
 */

export function renderGateMonitoring() {
    return `
        <div class="page-header" style="margin-bottom: 24px;">
            <h1>Gate Monitoring</h1>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <!-- Live Camera Feed -->
            <div class="card" style="padding: 24px;">
                <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span>Live Camera</span>
                </h3>
                <video id="gate-camera" autoplay style="width: 100%; border-radius: 10px; background: #000; aspect-ratio: 4/3;"></video>
                <canvas id="gate-canvas" style="display: none;"></canvas>
                <button onclick="window.toggleGateCamera()" class="btn btn-primary" style="margin-top: 16px; width: 100%;">
                    <span id="camera-btn-text">Start Camera</span>
                </button>
                <div id="camera-status" style="margin-top: 12px; font-size: 0.85rem; color: #64748b; text-align: center; min-height: 20px;"></div>
            </div>
            
            <!-- Last Recognition Result -->
            <div class="card" style="padding: 24px;">
                <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                    <span>Last Recognition</span>
                </h3>
                <div id="gate-result" style="min-height: 350px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.95rem;">
                    Waiting for recognition...
                </div>
            </div>
        </div>
        
        <!-- Recent Activity Table -->
        <div class="card" style="padding: 0;">
            <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">Recent Activity</h3>
                <button onclick="window.refreshGateLogs()" class="btn btn-secondary" style="padding: 10px 20px; font-size: 0.85rem;">
                    Refresh
                </button>
            </div>
            <div id="gate-logs-container" style="max-height: 450px; overflow-y: auto;"></div>
        </div>
    `;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash;
    if (hash.includes('gate-monitoring')) {
        setTimeout(() => {
            refreshGateLogs();
        }, 500);
    }
});

// Camera state
let cameraInterval = null;
let cameraStream = null;

// Toggle camera on/off
window.toggleGateCamera = async function () {
    const video = document.getElementById('gate-camera');
    const btn = document.getElementById('camera-btn-text');
    const status = document.getElementById('camera-status');

    if (cameraStream) {
        // Stop camera
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        clearInterval(cameraInterval);
        cameraInterval = null;
        btn.textContent = 'Start Camera';
        status.textContent = '';
        return;
    }

    try {
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        video.srcObject = cameraStream;
        btn.textContent = 'Stop Camera';
        status.textContent = 'Camera active - Auto-recognizing every 3 seconds';
        status.style.color = '#10b981';

        // Wait for video to be ready
        await new Promise(resolve => {
            video.onloadedmetadata = resolve;
        });

        // Auto-capture and recognize every 3 seconds
        cameraInterval = setInterval(() => {
            captureAndRecognize();
        }, 3000);

        // First capture immediately
        setTimeout(() => captureAndRecognize(), 500);

    } catch (err) {
        status.textContent = 'Camera access denied. Please allow camera permissions.';
        status.style.color = '#ef4444';
        console.error('Camera error:', err);
    }
};

// Capture frame and send for recognition
async function captureAndRecognize() {
    const video = document.getElementById('gate-camera');
    const canvas = document.getElementById('gate-canvas');
    const status = document.getElementById('camera-status');

    if (!video || !video.videoWidth) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    try {
        status.textContent = '🔍 Recognizing...';
        status.style.color = '#3b82f6';

        const result = await fetchAPI('/api/v1/gate/recognize', {
            method: 'POST',
            body: JSON.stringify({
                image_data: imageData,
                direction: 'entry'
            })
        });

        if (result.success || result.employee_id !== undefined) {
            displayResult(result);
            await refreshGateLogs();
            status.textContent = 'Recognition complete';
            status.style.color = '#10b981';
        } else {
            status.textContent = (result.message || 'No face detected');
            status.style.color = '#f59e0b';
        }
    } catch (err) {
        console.error('Recognition failed:', err);
        status.textContent = 'Recognition error';
        status.style.color = '#ef4444';
    }
}

// Display recognition result
function displayResult(result) {
    const container = document.getElementById('gate-result');
    const status = result.recognized ? 'RECOGNIZED' : 'UNKNOWN';
    const color = result.recognized ? '#10b981' : '#ef4444';
    const bgColor = result.recognized ? '#f0fdf4' : '#fef2f2';
    const icon = result.recognized ? '' : '';

    container.innerHTML = `
        <div style="text-align: center; width: 100%;">
            <div style="font-size: 5rem; margin-bottom: 16px;">${icon}</div>
            <div style="
                font-size: 1.5rem; 
                font-weight: 700; 
                color: ${color}; 
                margin-bottom: 12px;
                padding: 8px 24px;
                background: ${bgColor};
                border-radius: 12px;
                display: inline-block;
            ">
                ${status}
            </div>
            <div style="font-size: 2rem; font-weight: 600; color: #1e293b; margin: 16px 0;">
                ${result.name || 'Unknown Person'}
            </div>
            <div style="color: #64748b; font-size: 1rem; margin-bottom: 8px;">
                Confidence: <strong>${(result.score * 100).toFixed(1)}%</strong>
            </div>
            <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 16px;">
                ${result.timestamp ? new Date(result.timestamp).toLocaleString() : ''}
            </div>
            ${result.snapshot ? `
                <img src="/static/snapshots/${result.snapshot}" 
                     style="
                        width: 140px; 
                        height: 140px; 
                        border-radius: 16px; 
                        margin-top: 8px; 
                        object-fit: cover; 
                        border: 4px solid ${color};
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                     "
                     onclick="viewSnapshot('/static/snapshots/${result.snapshot}')"
                     title="Click to view full size">
            ` : ''}
        </div>
    `;
}

// Refresh recent logs table
window.refreshGateLogs = async function () {
    try {
        const logs = await fetchAPI('/api/v1/gate/logs?limit=50');
        const container = document.getElementById('gate-logs-container');

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div style="padding: 60px; text-align: center; color: #94a3b8;">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🚪</div>
                    <div style="font-size: 1.1rem;">No gate activity recorded yet</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8fafc; position: sticky; top: 0; z-index: 1;">
                    <tr>
                        <th style="padding: 14px 16px; text-align: left; font-weight: 600; color: #475569;">Time</th>
                        <th style="padding: 14px 16px; text-align: left; font-weight: 600; color: #475569;">Employee</th>
                        <th style="padding: 14px 16px; text-align: center; font-weight: 600; color: #475569;">Direction</th>
                        <th style="padding: 14px 16px; text-align: center; font-weight: 600; color: #475569;">Score</th>
                        <th style="padding: 14px 16px; text-align: center; font-weight: 600; color: #475569;">Status</th>
                        <th style="padding: 14px 16px; text-align: center; font-weight: 600; color: #475569;">Photo</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(log => {
            const timeStr = new Date(log.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" 
                                onmouseover="this.style.background='#f8fafc'" 
                                onmouseout="this.style.background='white'">
                                <td style="padding: 14px 16px; font-size: 0.85rem; color: #64748b;">
                                    ${timeStr}
                                </td>
                                <td style="padding: 14px 16px; font-weight: 600; color: #1e293b;">
                                    ${log.employee_name}
                                </td>
                                <td style="padding: 14px 16px; text-align: center;">
                                    ${log.direction === 'entry' ?
                    '<span style="color: #10b981; font-weight: 600;">→ Entry</span>' :
                    '<span style="color: #ef4444; font-weight: 600;">← Exit</span>'
                }
                                </td>
                                <td style="padding: 14px 16px; text-align: center; font-size: 0.9rem; color: #64748b;">
                                    ${(log.face_score * 100).toFixed(1)}%
                                </td>
                                <td style="padding: 14px 16px; text-align: center;">
                                    ${log.recognized ?
                    '<span style="color: #10b981; font-weight: 600;">Recognized</span>' :
                    '<span style="color: #ef4444; font-weight: 600;">Unknown</span>'
                }
                                </td>
                                <td style="padding: 14px 16px; text-align: center;">
                                    ${log.snapshot_path ?
                    `<img src="/static/snapshots/${log.snapshot_path}" 
                                              onclick="viewSnapshot('/static/snapshots/${log.snapshot_path}')"
                                              style="width: 36px; height: 36px; border-radius: 8px; cursor: pointer; object-fit: cover; border: 2px solid ${log.recognized ? '#10b981' : '#ef4444'};"
                                              title="Click to view">`
                    : '<span style="color: #cbd5e1;">-</span>'
                }
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        console.error('Failed to load gate logs:', err);
        const container = document.getElementById('gate-logs-container');
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #ef4444;">
                Failed to load logs. Please try again.
            </div>
        `;
    }
};
