/**
 * Module Chấm Công AI - Nhận diện khuôn mặt thời gian thực
 * Thiết kế cao cấp với tích hợp Camera
 */

import { getState } from '../core/state.js';
import { showToast } from '../utils/toast.js';

let stream = null;
let scanningInterval = null;
let isScanning = false;
let consecutiveFailures = 0;

export function renderAIAttendance() {
    const appData = getState();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Dọn dẹp stream hiện tại nếu re-render
    cleanupAICamera();

    // Khởi tạo camera sau một khoảng delay ngắn để đảm bảo DOM đã ready
    setTimeout(() => initCamera(), 100);

    return `
        <div class="page-header">
            <div style="display: flex; align-items: center; gap: 15px;">
                <button class="btn btn-secondary btn-small" onclick="window.navigateTo('dashboard')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back
                </button>
                <h1>Check-In/Out</h1>
            </div>
        </div>

        <div class="card" style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
            
            <!-- Face Camera Feed Area -->
            <div id="ai-video-container" style="width: 100%; aspect-ratio: 16/9; background: #0f172a; border-radius: 24px; position: relative; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); border: 4px solid #f8fafc;">
                
                <!-- Video Stream -->
                <video id="ai-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                
                <!-- Canvas for Capturing (Hidden) -->
                <canvas id="ai-canvas" style="display: none;"></canvas>
                
                <!-- Scanning Frame/Overlay -->
                <div id="scan-frame" style="position: absolute; inset: 0; border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 24px; pointer-events: none;">
                    <!-- Corners -->
                    <div style="position: absolute; top: 20px; left: 20px; width: 40px; height: 40px; border-top: 4px solid #3b82f6; border-left: 4px solid #3b82f6; border-radius: 4px 0 0 0;"></div>
                    <div style="position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; border-top: 4px solid #3b82f6; border-right: 4px solid #3b82f6; border-radius: 0 4px 0 0;"></div>
                    <div style="position: absolute; bottom: 20px; left: 20px; width: 40px; height: 40px; border-bottom: 4px solid #3b82f6; border-left: 4px solid #3b82f6; border-radius: 0 0 0 4px;"></div>
                    <div style="position: absolute; bottom: 20px; right: 20px; width: 40px; height: 40px; border-bottom: 4px solid #3b82f6; border-right: 4px solid #3b82f6; border-radius: 0 0 4px 0;"></div>
                </div>

                <!-- Status Overlay -->
                <div id="ai-status-overlay" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); padding: 12px 30px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.15); display: flex; align-items: center; gap: 12px; z-index: 10; transition: all 0.3s; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                    <div id="ai-status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; transition: background 0.3s;"></div>
                    <span id="ai-status-text" style="color: #fff; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.02em;">Initializing System...</span>
                </div>

                <!-- Scanning Line Animation -->
                <div id="ai-scan-line" style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #3b82f6, transparent); box-shadow: 0 0 20px #3b82f6; z-index: 5; opacity: 0; pointer-events: none;"></div>
            </div>

            <div style="width: 100%; display: grid; grid-template-columns: 1fr; gap: 24px;">
                <div class="card" style="margin-bottom: 0; background: #fafafa; border: 1px solid #f1f5f9; padding: 24px; border-radius: 20px;">
                    <div style="display: flex; flex-direction: column; gap: 12px;" id="ai-session-info">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 500;">Intent:</span>
                            <span style="background: #eef2ff; color: #6366f1; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; border: 1px solid #c7d2fe;">
                                ${localStorage.getItem('attendance_intent')?.replace('check', 'Check-') || 'Check-in'}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #64748b; font-weight: 500;">Date:</span>
                            <span style="color: #1e293b; font-weight: 700;">${today}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Enrollment Tip (Hidden by default) -->
            <div id="enrollment-tip" style="display: none; width: 100%; background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 20px; text-align: center; animation: slideUp 0.4s ease;">
                <div style="font-size: 1.2rem; margin-bottom: 8px;">💡</div>
                <div style="font-weight: 700; color: #92400e; margin-bottom: 4px;">Face ID Not Recognized</div>
                <div style="font-size: 0.85rem; color: #b45309; margin-bottom: 12px;">You might need to register your Face ID first or request a reset if it's failed.</div>
                <button onclick="window.navigateTo('myprofile/registration')" class="btn btn-secondary btn-small" style="background: #f59e0b; color: white; border: none;">Go to Registration →</button>
            </div>

        </div>

        <style>
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes scanLineMove {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 0.8; }
                90% { opacity: 0.8; }
                100% { top: 100%; opacity: 0; }
            }
            .scanning-active #ai-scan-line {
                opacity: 1;
                animation: scanLineMove 3s infinite ease-in-out;
            }
            @keyframes pulseIndicator {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.4); opacity: 0.5; }
                100% { transform: scale(1); opacity: 1; }
            }
            .analyzing-active #ai-status-indicator {
                background: #f59e0b !important;
                box-shadow: 0 0 12px #f59e0b;
                animation: pulseIndicator 1s infinite;
            }
            .success-active #ai-status-indicator {
                background: #10b981 !important;
                box-shadow: 0 0 15px #10b981;
            }
            .error-active #ai-status-indicator {
                background: #ef4444 !important;
                box-shadow: 0 0 12px #ef4444;
            }
        </style>
    `;
}

async function initCamera() {
    const video = document.getElementById('ai-video');
    const statusText = document.getElementById('ai-status-text');
    const indicator = document.getElementById('ai-status-indicator');
    const container = document.getElementById('ai-video-container');

    if (!video) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            }
        });
        video.srcObject = stream;

        statusText.textContent = "Scanning Faces...";
        indicator.style.background = "#3b82f6";
        container.classList.add('scanning-active');

        // Cho camera khởi động xong rồi mới bắt đầu capture loop
        setTimeout(() => startCaptureLoop(), 1000);
    } catch (err) {
        statusText.textContent = "Camera Blocked";
        indicator.style.background = "#ef4444";
        showToast("Access Denied: Please enable camera permissions", "error");
        console.error("Camera Access Error:", err);
    }
}

function startCaptureLoop() {
    if (isScanning) return;
    isScanning = true;
    consecutiveFailures = 0;

    // Khoảng quét nhanh hơn (mỗi 1.5 giây) để cảm giác nhanh nhẹn
    scanningInterval = setInterval(() => captureAndAnalyze(), 1500);
}

async function captureAndAnalyze() {
    const video = document.getElementById('ai-video');
    const canvas = document.getElementById('ai-canvas');
    const statusText = document.getElementById('ai-status-text');
    const container = document.getElementById('ai-video-container');

    if (!video || !canvas || !isScanning) return;

    // Chuẩn bị canvas từ video frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Vẽ frame hiện tại
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Chuyển sang JPEG base64 (Backend yêu cầu định dạng này)
    const encodedImage = canvas.toDataURL('image/jpeg', 0.85);
    const intent = localStorage.getItem('attendance_intent') || 'checkin';

    container.classList.add('analyzing-active');
    statusText.textContent = "Analyzing Geometry...";

    try {
        const { fetchAPI } = await import('../core/api.js');
        const response = await fetchAPI('/api/v1/face-attendance/verify', {
            method: 'POST',
            body: JSON.stringify({ image_data: encodedImage, intent: intent })
        });

        if (response.match && response.ok) {
            handleVerificationSuccess(response);
        } else {
            // Xử lý các lỗi cụ thể
            consecutiveFailures++;

            // Nếu thiếu biometrics, hiển tip ngay lập tức
            if (response.message?.includes("registered")) {
                document.getElementById('enrollment-tip').style.display = 'block';
                statusText.textContent = "Bio-Identity Not Registered";
            } else {
                statusText.textContent = response.message || "Scanning Content...";
            }

            // Hiển tip chung sau 3 lần thất bại
            if (consecutiveFailures >= 3) {
                document.getElementById('enrollment-tip').style.display = 'block';
            }

            setTimeout(() => {
                if (isScanning) container.classList.remove('analyzing-active');
            }, 500);
        }
    } catch (err) {
        console.error("[AI Attendance] Scan Error:", err);
        statusText.textContent = "API Connection Fault";
        container.classList.add('error-active');
        setTimeout(() => container.classList.remove('error-active'), 1000);
    }
}

function handleVerificationSuccess(data) {
    isScanning = false;
    clearInterval(scanningInterval);

    const statusText = document.getElementById('ai-status-text');
    const container = document.getElementById('ai-video-container');

    container.classList.remove('analyzing-active');
    container.classList.remove('scanning-active');
    container.classList.add('success-active');

    statusText.textContent = `Identity Confirmed: ${data.name}`;

    showToast(`Welcome ${data.name}`, "success");

    // Giữ một chút để user thấy họ đã được nhận diện
    setTimeout(async () => {
        const { fetchDashboardData } = await import('../core/api.js');
        await fetchDashboardData();

        // Dọn dẹp và navigate
        localStorage.removeItem('attendance_intent');
        window.navigateTo('dashboard');

        const action = localStorage.getItem('attendance_intent') === 'checkout' ? 'Check-out' : 'Check-in';
        showToast(`${action} successfully logged!`, "success");
    }, 2000);
}

export function cleanupAICamera() {
    isScanning = false;
    if (scanningInterval) {
        clearInterval(scanningInterval);
        scanningInterval = null;
    }
    if (stream) {
        stream.getTracks().forEach(track => {
            console.log('[AI Attendance] Stopping camera track:', track.label);
            track.stop();
        });
        stream = null;
    }
}

// Global hook cho navigation system
window.cleanupAICamera = cleanupAICamera;
