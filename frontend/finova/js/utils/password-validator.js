
/**

 * @param {string} password 
 * @returns {Object} 
 */
export function validatePassword(password) {
    if (!password) {
        return {
            valid: false,
            minLength: false,
            hasUpper: false,
            hasLower: false,
            hasNumber: false,
            hasSpecial: false,
            strength: 0
        };
    }

    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const valid = minLength && hasUpper && hasLower && hasNumber && hasSpecial;

    let strength = 0;
    if (minLength) strength++;
    if (hasUpper) strength++;
    if (hasLower) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;

    return {
        valid,
        minLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        strength
    };
}

/**

 * @param {number} strength 
 * @returns {Object}
 */
export function getStrengthInfo(strength) {
    const levels = [
        { label: 'Very Weak', color: '#ef4444' },
        { label: 'Weak', color: '#f97316' },
        { label: 'Fair', color: '#f59e0b' },
        { label: 'Good', color: '#84cc16' },
        { label: 'Strong', color: '#22c55e' },
        { label: 'Very Strong', color: '#10b981' }
    ];

    return levels[strength] || levels[0];
}

/**
 * @param {number} strength
 * @returns {string}
 */
export function renderStrengthIndicator(strength) {
    const info = getStrengthInfo(strength);
    const percentage = (strength / 5) * 100;

    return `
        <div style="margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.75rem; font-weight: 600; color: ${info.color};">${info.label}</span>
                <span style="font-size: 0.7rem; color: #94a3b8;">${strength}/5</span>
            </div>
            <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; background: ${info.color}; width: ${percentage}%; transition: all 0.3s ease;"></div>
            </div>
        </div>
    `;
}

/**
 
 * @param {Object} validation 
 * @returns {string} 
 */
export function renderRequirements(validation) {
    const requirements = [
        { key: 'minLength', text: 'At least 8 characters' },
        { key: 'hasUpper', text: 'One uppercase letter (A-Z)' },
        { key: 'hasLower', text: 'One lowercase letter (a-z)' },
        { key: 'hasNumber', text: 'One number (0-9)' },
        { key: 'hasSpecial', text: 'One special character (!@#$%^&*)' }
    ];

    return `
        <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">Password Requirements</div>
            <div style="display: grid; gap: 6px;">
                ${requirements.map(req => {
        const met = validation[req.key];
        const color = met ? '#10b981' : '#94a3b8';
        const icon = met ? '✓' : '○';
        return `
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: ${color};">
                            <span style="font-weight: 700;">${icon}</span>
                            <span>${req.text}</span>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}
