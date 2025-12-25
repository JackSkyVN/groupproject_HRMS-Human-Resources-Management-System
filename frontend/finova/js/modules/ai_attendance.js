/**
 * AI Attendance Module - Placeholder for Facial Recognition integration
 */

import { getState } from '../core/state.js';

export function renderAIAttendance() {
    const appData = getState();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
        <div class="page-header">
            <div style="display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-secondary btn-small" onclick="window.navigateTo('dashboard')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back
                </button>
                <h1>AI Attendance Recognition</h1>
            </div>
            <p>Please face the camera to verify your identity</p>
        </div>

        <div class="card" style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 24px;">
            <!-- AI Camera Feed Placeholder -->
            <div id="ai-video-container" style="width: 100%; aspect-ratio: 16/9; background: #1e293b; border-radius: 16px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <div style="text-align: center; color: #94a3b8;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 15px; opacity: 0.5;">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <p style="font-size: 1.1rem; font-weight: 500;">AI Vision System - Waiting for Initialization...</p>
                    <p style="font-size: 0.85rem; margin-top: 8px;">(Facial Recognition Component will be integrated here)</p>
                </div>
                
                <!-- Scanning Overlay (Simulated) -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: rgba(59, 130, 246, 0.5); box-shadow: 0 0 15px #3b82f6; animation: scanAnim 3s infinite ease-in-out;"></div>
            </div>

            <div style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="card" style="margin-bottom: 0; background: #f8fafc; border: 1px solid #e2e8f0;">
                    <h3 style="font-size: 0.9rem; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Session Info</h3>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #475569;">Employee:</span>
                            <strong style="color: #1e293b;">${appData.currentUser?.name || 'Authorized User'}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #475569;">Date:</span>
                            <span style="color: #1e293b;">${today}</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 0; background: #f8fafc; border: 1px solid #e2e8f0;">
                    <h3 style="font-size: 0.9rem; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Guidelines</h3>
                    <ul style="font-size: 0.85rem; color: #475569; padding-left: 20px; line-height: 1.5;">
                        <li>Remove masks or sunglasses</li>
                        <li>Ensure good lighting on your face</li>
                        <li>Stay still for 2-3 seconds</li>
                    </ul>
                </div>
            </div>

            <div style="display: flex; gap: 16px;">
                <button class="btn btn-primary" style="padding: 14px 40px; font-size: 1rem; border-radius: 12px;" onclick="simulateAISuccess()">
                    Simulate Successful AI Scan
                </button>
            </div>
        </div>

        <style>
            @keyframes scanAnim {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
        </style>
    `;
}

window.simulateAISuccess = async function () {
    const { showToast } = await import('../utils/toast.js');
    const { checkIn, checkOut, fetchDashboardData } = await import('../core/api.js');

    // Read intent from dashboard click
    const intent = localStorage.getItem('attendance_intent') || 'checkin';

    showToast(`Face recognized! Processing ${intent}...`, "success");

    try {
        let response;
        if (intent === 'checkin') {
            response = await checkIn();
        } else {
            response = await checkOut();
        }

        if (response.ok) {
            await fetchDashboardData();
            // Clear intent
            localStorage.removeItem('attendance_intent');

            setTimeout(() => {
                window.navigateTo('dashboard');
                showToast(`Attendance ${intent} successful!`, "success");
            }, 1000);
        }
    } catch (error) {
        showToast("Sync Error: " + error.message, "error");
    }
};
