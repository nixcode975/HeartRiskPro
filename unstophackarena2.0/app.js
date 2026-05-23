/* ============================================
   HeartRisk Pro — Application Logic
   ASCVD 10-Year Risk Calculator
   ============================================ */

(function () {
    'use strict';

    // ==========================================
    // ASCVD Constants (Pooled Cohort Equations)
    // ==========================================
    const ASCVD_CONSTANTS = {
        constants: {
            white_male:   { mean_score: 61.18,  baseline_survival: 0.9144 },
            white_female: { mean_score: -29.18, baseline_survival: 0.9665 },
            aa_male:      { mean_score: 19.54,  baseline_survival: 0.8954 },
            aa_female:    { mean_score: 86.61,  baseline_survival: 0.9533 }
        },
        beta_weights: {
            white_male: {
                ln_age: 12.344, ln_age_sq: 0.0, ln_total_chol: 11.853, ln_age_total_chol: -2.664,
                ln_hdl: -7.774, ln_age_hdl: 1.761, treated_sbp: 1.797,
                age_treated_sbp: 0.0, untreated_sbp: 1.764, age_untreated_sbp: 0.0,
                smoker: 7.837, age_smoker: -1.795, diabetes: 0.658
            },
            white_female: {
                ln_age: -29.799, ln_age_sq: 4.884, ln_total_chol: 13.540, ln_age_total_chol: -3.114,
                ln_hdl: -13.578, ln_age_hdl: 3.149, treated_sbp: 2.019,
                age_treated_sbp: 0.0, untreated_sbp: 1.957, age_untreated_sbp: 0.0,
                smoker: 7.574, age_smoker: -1.665, diabetes: 0.661
            },
            aa_male: {
                ln_age: 2.469, ln_age_sq: 0.0, ln_total_chol: 0.302, ln_age_total_chol: 0.0,
                ln_hdl: -0.307, ln_age_hdl: 0.0, treated_sbp: 1.916,
                age_treated_sbp: 0.0, untreated_sbp: 1.809, age_untreated_sbp: 0.0,
                smoker: 0.549, age_smoker: 0.0, diabetes: 0.645
            },
            aa_female: {
                ln_age: 17.114, ln_age_sq: 0.0, ln_total_chol: 0.940, ln_age_total_chol: 0.0,
                ln_hdl: -18.920, ln_age_hdl: 4.475, treated_sbp: 29.291,
                age_treated_sbp: -6.432, untreated_sbp: 27.828, age_untreated_sbp: -6.087,
                smoker: 0.691, age_smoker: 0.0, diabetes: 0.874
            }
        }
    };

    // Cholesterol SI → US conversion factor
    const MMOL_TO_MGDL = 38.67;

    // ==========================================
    // DOM References
    // ==========================================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Pages
    const pages = {
        login:      $('#page-login'),
        signup:     $('#page-signup'),
        calculator: $('#page-calculator')
    };

    // ==========================================
    // Page Navigation
    // ==========================================
    function navigateTo(pageName) {
        Object.values(pages).forEach(p => p.classList.remove('active', 'fade-in'));
        const target = pages[pageName];
        if (target) {
            target.classList.add('active', 'fade-in');
        }
    }

    // ==========================================
    // Toast Notifications
    // ==========================================
    let toastEl = null;
    let toastTimer = null;

    function createToast() {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }

    function showToast(message, type = 'info') {
        if (!toastEl) createToast();
        toastEl.textContent = message;
        toastEl.className = 'toast ' + type;
        // Force reflow
        void toastEl.offsetWidth;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3000);
    }

    // ==========================================
    // Simple User Store (localStorage)
    // ==========================================
    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem('heartrisk_users') || '[]');
        } catch { return []; }
    }

    function saveUsers(users) {
        localStorage.setItem('heartrisk_users', JSON.stringify(users));
    }

    function getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem('heartrisk_current_user'));
        } catch { return null; }
    }

    function setCurrentUser(user) {
        sessionStorage.setItem('heartrisk_current_user', JSON.stringify(user));
    }

    function clearCurrentUser() {
        sessionStorage.removeItem('heartrisk_current_user');
    }

    // ==========================================
    // Validation Helpers
    // ==========================================
    function showError(id, msg) {
        const el = $(`#${id}`);
        if (el) {
            el.textContent = msg;
            el.classList.add('visible');
        }
    }

    function clearError(id) {
        const el = $(`#${id}`);
        if (el) {
            el.textContent = '';
            el.classList.remove('visible');
        }
    }

    function clearAllErrors(prefix) {
        $$(`[id^="${prefix}"][id$="-error"]`).forEach(el => {
            el.textContent = '';
            el.classList.remove('visible');
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ==========================================
    // Password Strength
    // ==========================================
    function updatePasswordStrength(password) {
        const fill = $('#strength-fill');
        const text = $('#strength-text');
        if (!fill || !text) return;

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { width: '0%', color: 'transparent', label: '' },
            { width: '20%', color: '#ef4444', label: 'Weak' },
            { width: '40%', color: '#f97316', label: 'Fair' },
            { width: '60%', color: '#eab308', label: 'Good' },
            { width: '80%', color: '#22c55e', label: 'Strong' },
            { width: '100%', color: '#16a34a', label: 'Excellent' }
        ];
        const level = levels[score] || levels[0];
        fill.style.width = level.width;
        fill.style.background = level.color;
        text.textContent = level.label;
        text.style.color = level.color;
    }

    // ==========================================
    // Toggle Password Visibility
    // ==========================================
    function initTogglePassword() {
        $$('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
                } else {
                    input.type = 'password';
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
                }
            });
        });
    }

    // ==========================================
    // LOGIN FORM
    // ==========================================
    function initLoginForm() {
        const form = $('#login-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            clearAllErrors('login');

            const email = $('#login-email').value.trim();
            const password = $('#login-password').value;
            let valid = true;

            if (!email) { showError('login-email-error', 'Email is required'); valid = false; }
            else if (!isValidEmail(email)) { showError('login-email-error', 'Enter a valid email address'); valid = false; }

            if (!password) { showError('login-password-error', 'Password is required'); valid = false; }

            if (!valid) return;

            // Simulate loading
            const btn = $('#login-submit-btn');
            btn.classList.add('loading');

            setTimeout(() => {
                const users = getUsers();
                const user = users.find(u => u.email === email && u.password === password);

                btn.classList.remove('loading');

                if (user) {
                    setCurrentUser(user);
                    $('#nav-user-name').textContent = user.name;
                    showToast('Welcome back, ' + user.name.split(' ')[0] + '!', 'success');
                    navigateTo('calculator');
                } else {
                    showToast('Invalid email or password', 'error');
                    showError('login-password-error', 'Invalid credentials. Please try again.');
                }
            }, 800);
        });
    }

    // ==========================================
    // SIGNUP FORM
    // ==========================================
    function initSignupForm() {
        const form = $('#signup-form');
        if (!form) return;

        // Password strength live feedback
        const pwInput = $('#signup-password');
        if (pwInput) {
            pwInput.addEventListener('input', () => updatePasswordStrength(pwInput.value));
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            clearAllErrors('signup');

            const name = $('#signup-name').value.trim();
            const email = $('#signup-email').value.trim();
            const password = $('#signup-password').value;
            const confirm = $('#signup-confirm').value;
            let valid = true;

            if (!name || name.length < 2) { showError('signup-name-error', 'Please enter your full name'); valid = false; }
            if (!email) { showError('signup-email-error', 'Email is required'); valid = false; }
            else if (!isValidEmail(email)) { showError('signup-email-error', 'Enter a valid email address'); valid = false; }

            if (!password || password.length < 6) { showError('signup-password-error', 'Password must be at least 6 characters'); valid = false; }
            if (password !== confirm) { showError('signup-confirm-error', 'Passwords do not match'); valid = false; }

            if (!valid) return;

            const btn = $('#signup-submit-btn');
            btn.classList.add('loading');

            setTimeout(() => {
                const users = getUsers();
                if (users.find(u => u.email === email)) {
                    btn.classList.remove('loading');
                    showError('signup-email-error', 'An account with this email already exists');
                    return;
                }

                const newUser = { name, email, password };
                users.push(newUser);
                saveUsers(users);

                btn.classList.remove('loading');
                showToast('Account created! Please sign in.', 'success');
                navigateTo('login');

                // Pre-fill email on login
                const loginEmail = $('#login-email');
                if (loginEmail) loginEmail.value = email;
            }, 800);
        });
    }

    // ==========================================
    // TOGGLE GROUP LOGIC
    // ==========================================
    function initToggleGroups() {
        $$('.toggle-group').forEach(group => {
            const buttons = group.querySelectorAll('.toggle-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        });
    }

    function getToggleValue(groupId) {
        const group = $(`#${groupId}`);
        if (!group) return null;
        const selected = group.querySelector('.toggle-btn.selected');
        return selected ? selected.dataset.value : null;
    }

    // ==========================================
    // BMI CALCULATION
    // ==========================================
    function calculateBMI(heightCm, weightKg) {
        const heightM = heightCm / 100;
        const bmi = weightKg / (heightM * heightM);
        return bmi;
    }

    function getBMICategory(bmi) {
        if (bmi < 18.5) return { label: 'Underweight', cssClass: 'bmi-underweight', color: '#3b82f6' };
        if (bmi < 25)   return { label: 'Healthy Weight', cssClass: 'bmi-healthy', color: '#22c55e' };
        if (bmi < 30)   return { label: 'Overweight', cssClass: 'bmi-overweight', color: '#f97316' };
        return { label: 'Obese', cssClass: 'bmi-obese', color: '#ef4444' };
    }

    function updateBMIDisplay() {
        const heightEl = $('#calc-height');
        const weightEl = $('#calc-weight');
        const bmiCard = $('#bmi-result-card');
        const bmiValue = $('#bmi-value');
        const bmiLabel = $('#bmi-label');
        const bmiFill = $('#bmi-bar-fill');
        const bmiPointer = $('#bmi-pointer');

        if (!heightEl || !weightEl || !bmiCard) return;

        const height = parseFloat(heightEl.value);
        const weight = parseFloat(weightEl.value);

        if (!height || !weight || height < 100 || height > 250 || weight < 30 || weight > 300) {
            bmiCard.classList.add('hidden');
            return;
        }

        const bmi = calculateBMI(height, weight);
        const category = getBMICategory(bmi);

        bmiValue.textContent = bmi.toFixed(1);
        bmiValue.style.color = category.color;
        bmiLabel.textContent = category.label;
        bmiLabel.className = 'bmi-category-label ' + category.cssClass;

        // Position pointer on the bar (BMI range 10-45 mapped to 0-100%)
        const pct = Math.max(0, Math.min(100, ((bmi - 10) / 35) * 100));
        if (bmiPointer) bmiPointer.style.left = pct + '%';
        if (bmiFill) bmiFill.style.width = pct + '%';

        bmiCard.classList.remove('hidden');
    }

    // ==========================================
    // ASCVD CALCULATION ENGINE
    // ==========================================
    function calculateASCVD(inputs) {
        // Determine demographic profile key
        const sexKey = inputs.sex === 'male' ? 'male' : 'female';
        const raceKey = inputs.race === 'aa' ? 'aa' : 'white';
        const profileKey = `${raceKey}_${sexKey}`;

        const consts = ASCVD_CONSTANTS.constants[profileKey];
        const beta = ASCVD_CONSTANTS.beta_weights[profileKey];

        if (!consts || !beta) {
            throw new Error('Invalid demographic profile: ' + profileKey);
        }

        // Convert cholesterol from mmol/L to mg/dL
        const totalChol_mgdL = inputs.totalChol * MMOL_TO_MGDL;
        const hdl_mgdL = inputs.hdl * MMOL_TO_MGDL;

        // Pre-compute natural logs
        const lnAge = Math.log(inputs.age);
        const lnTotalChol = Math.log(totalChol_mgdL);
        const lnHDL = Math.log(hdl_mgdL);
        const lnSBP = Math.log(inputs.sbp);

        // Block 1: Age (includes age-squared term for white_female)
        const lnAgeSq = lnAge * lnAge;
        const block1 = (beta.ln_age * lnAge) + (beta.ln_age_sq * lnAgeSq);

        // Block 2: Total Cholesterol
        const block2 = (beta.ln_total_chol * lnTotalChol)
                      + (beta.ln_age_total_chol * lnAge * lnTotalChol);

        // Block 3: HDL Cholesterol
        const block3 = (beta.ln_hdl * lnHDL)
                      + (beta.ln_age_hdl * lnAge * lnHDL);

        // Block 4: Systolic Blood Pressure (treated vs untreated)
        let block4;
        if (inputs.bpMed) {
            block4 = (beta.treated_sbp * lnSBP)
                   + (beta.age_treated_sbp * lnAge * lnSBP);
        } else {
            block4 = (beta.untreated_sbp * lnSBP)
                   + (beta.age_untreated_sbp * lnAge * lnSBP);
        }

        // Block 5: Smoking
        const smokerVal = inputs.smoker ? 1 : 0;
        const block5 = (beta.smoker * smokerVal)
                      + (beta.age_smoker * lnAge * smokerVal);

        // Block 6: Diabetes
        const diabetesVal = inputs.diabetes ? 1 : 0;
        const block6 = beta.diabetes * diabetesVal;

        // Sum all blocks = Individual Score
        const individualScore = block1 + block2 + block3 + block4 + block5 + block6;

        // Master Survival Equation
        const scalingFactor = Math.exp(individualScore - consts.mean_score);
        const risk = 1 - Math.pow(consts.baseline_survival, scalingFactor);
        const riskPercent = risk * 100;

        return {
            risk: riskPercent,
            profileKey,
            individualScore,
            meanScore: consts.mean_score,
            baselineSurvival: consts.baseline_survival,
            blocks: { block1, block2, block3, block4, block5, block6 },
            converted: {
                totalChol_mgdL: totalChol_mgdL.toFixed(1),
                hdl_mgdL: hdl_mgdL.toFixed(1)
            }
        };
    }

    // ==========================================
    // DISPLAY RESULT
    // ==========================================
    function displayResult(result) {
        const card = $('#result-card');
        const pctEl = $('#result-percentage');
        const catEl = $('#result-category');
        const expEl = $('#result-explanation');
        const breakdownEl = $('#result-breakdown');
        const needleLine = $('#gauge-needle');

        card.classList.remove('hidden');
        // Re-trigger animation
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = '';

        const pct = Math.max(0, Math.min(result.risk, 100));
        const rounded = pct.toFixed(1);

        // Determine risk category
        let category, catClass, color, explanation;
        if (pct < 5) {
            category = 'Low Risk';
            catClass = 'low';
            color = 'var(--risk-low)';
            explanation = `Your estimated 10-year ASCVD risk is ${rounded}%. This is considered low risk. Continue maintaining a healthy lifestyle with regular exercise, a balanced diet, and routine check-ups.`;
        } else if (pct < 7.5) {
            category = 'Borderline Risk';
            catClass = 'borderline';
            color = 'var(--risk-borderline)';
            explanation = `Your estimated 10-year ASCVD risk is ${rounded}%. This is borderline risk. Discuss lifestyle modifications with your healthcare provider and consider additional risk-enhancing factors.`;
        } else if (pct < 20) {
            category = 'Intermediate Risk';
            catClass = 'intermediate';
            color = 'var(--risk-intermediate)';
            explanation = `Your estimated 10-year ASCVD risk is ${rounded}%. This is intermediate risk. Your clinician may recommend statin therapy and aggressive lifestyle changes to reduce your cardiovascular risk.`;
        } else {
            category = 'High Risk';
            catClass = 'high';
            color = 'var(--risk-high)';
            explanation = `Your estimated 10-year ASCVD risk is ${rounded}%. This is considered high risk. Immediate consultation with a cardiologist is strongly recommended. Statin therapy and intensive risk factor management are typically indicated.`;
        }

        // Animate percentage counter
        animateCounter(pctEl, 0, parseFloat(rounded), 1200, color);

        // Set category
        catEl.textContent = category;
        catEl.className = 'result-category ' + catClass;

        // Set explanation
        expEl.textContent = explanation;

        // AI Insight
        const aiBox = $('#ai-insight-box');
        const aiRiskLevel = $('#ai-risk-level');
        const aiConfidence = $('#ai-confidence');
        const aiWarnings = $('#ai-warnings');
        
        if (result.aiPrediction) {
            aiBox.classList.remove('hidden');
            aiRiskLevel.textContent = result.aiPrediction.risk_category;
            aiRiskLevel.className = 'ai-badge ' + (result.aiPrediction.risk_category ? result.aiPrediction.risk_category.toLowerCase() : '');
            aiConfidence.textContent = Math.round((result.aiPrediction.confidence_score || 0) * 100) + '%';
            
            aiWarnings.innerHTML = '';
            if (result.aiPrediction.warnings && result.aiPrediction.warnings.length > 0) {
                result.aiPrediction.warnings.forEach(w => {
                    const p = document.createElement('p');
                    p.innerHTML = `⚠️ ${w}`;
                    aiWarnings.appendChild(p);
                });
            }
        } else {
            if (aiBox) aiBox.classList.add('hidden');
        }

        // Animate gauge needle
        // Needle spans 0° (far left) to 180° (far right) relative to the arc
        const needleAngle = Math.min(pct / 40, 1) * 180; // cap at 40% for visual
        const actualAngle = Math.min((pct / 100) * 180, 180);
        setTimeout(() => {
            needleLine.setAttribute('transform', `rotate(${actualAngle}, 100, 100)`);
            needleLine.style.transition = 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }, 100);

        // Breakdown summary
        const profileNames = {
            white_male: 'General Ancestry Male',
            white_female: 'General Ancestry Female',
            aa_male: 'African Ancestry Male',
            aa_female: 'African Ancestry Female'
        };

        breakdownEl.innerHTML = `
            <div class="breakdown-item">
                <div class="breakdown-label">Profile</div>
                <div class="breakdown-value">${profileNames[result.profileKey]}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Total Chol (mg/dL)</div>
                <div class="breakdown-value">${result.converted.totalChol_mgdL}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">HDL (mg/dL)</div>
                <div class="breakdown-value">${result.converted.hdl_mgdL}</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">Individual Score</div>
                <div class="breakdown-value">${result.individualScore.toFixed(2)}</div>
            </div>
        `;

        // Smooth scroll to result
        setTimeout(() => {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    }

    function animateCounter(el, start, end, duration, color) {
        el.style.color = color;
        const range = end - start;
        const startTime = performance.now();

        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = (start + range * eased).toFixed(1);
            el.textContent = current + '%';

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }
        requestAnimationFrame(tick);
    }

    // ==========================================
    // CALCULATOR FORM
    // ==========================================
    function initCalcForm() {
        const form = $('#calc-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            clearAllErrors('calc');

            let valid = true;

            // Age
            const ageVal = parseInt($('#calc-age').value, 10);
            if (isNaN(ageVal) || ageVal < 40 || ageVal > 79) {
                showError('calc-age-error', 'Age must be between 40 and 79');
                valid = false;
            }

            // Sex
            const sex = getToggleValue('calc-sex-group');
            if (!sex) {
                showError('calc-sex-error', 'Please select biological sex');
                valid = false;
            }

            // Race
            const race = getToggleValue('calc-race-group');
            if (!race) {
                showError('calc-race-error', 'Please select race/demographic');
                valid = false;
            }

            // Total Cholesterol (mmol/L)
            const totalChol = parseFloat($('#calc-total-chol').value);
            if (isNaN(totalChol) || totalChol < 1 || totalChol > 15) {
                showError('calc-total-chol-error', 'Enter a valid total cholesterol (1–15 mmol/L)');
                valid = false;
            }

            // HDL Cholesterol (mmol/L)
            const hdl = parseFloat($('#calc-hdl').value);
            if (isNaN(hdl) || hdl < 0.3 || hdl > 5) {
                showError('calc-hdl-error', 'Enter a valid HDL cholesterol (0.3–5 mmol/L)');
                valid = false;
            }

            // SBP
            const sbp = parseInt($('#calc-sbp').value, 10);
            if (isNaN(sbp) || sbp < 90 || sbp > 200) {
                showError('calc-sbp-error', 'SBP must be between 90 and 200 mmHg');
                valid = false;
            }

            // Boolean toggles (already have defaults)
            const bpMed = getToggleValue('calc-bpmed-group') === 'yes';
            const diabetes = getToggleValue('calc-diabetes-group') === 'yes';
            const smoker = getToggleValue('calc-smoker-group') === 'yes';

            if (!valid) {
                showToast('Please correct the highlighted errors', 'error');
                return;
            }

            // Calculate
            const btn = $('#calc-submit-btn');
            btn.classList.add('loading');

            setTimeout(() => {
                try {
                    const result = calculateASCVD({
                        age: ageVal,
                        sex,
                        race,
                        totalChol,
                        hdl,
                        sbp,
                        bpMed,
                        diabetes,
                        smoker
                    });
                    
                    // Fetch AI Risk if parameters provided
                    const ef = $('#calc-ef').value ? parseFloat($('#calc-ef').value) : null;
                    const lvedd = $('#calc-lvedd').value ? parseFloat($('#calc-lvedd').value) : null;
                    const lvesd = $('#calc-lvesd').value ? parseFloat($('#calc-lvesd').value) : null;

                    if (ef || lvedd || lvesd) {
                        fetch('http://localhost:8000/predict-echo-risk', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ef, lvedd, lvesd, age: ageVal, sbp })
                        })
                        .then(res => res.json())
                        .then(aiData => {
                            if(aiData.status === 'success') {
                                result.aiPrediction = aiData.prediction;
                            }
                            displayResult(result);
                            btn.classList.remove('loading');
                        })
                        .catch(err => {
                            console.error('AI Predict Error:', err);
                            displayResult(result);
                            btn.classList.remove('loading');
                        });
                    } else {
                        displayResult(result);
                        btn.classList.remove('loading');
                    }
                } catch (err) {
                    showToast('Calculation error: ' + err.message, 'error');
                    console.error(err);
                    btn.classList.remove('loading');
                }
            }, 600);
        });

        // BMI live listeners
        const heightInput = $('#calc-height');
        const weightInput = $('#calc-weight');
        if (heightInput) heightInput.addEventListener('input', updateBMIDisplay);
        if (weightInput) weightInput.addEventListener('input', updateBMIDisplay);

        // Reset button
        const resetBtn = $('#calc-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                // Clear all toggle selections except defaults
                $$('#calc-sex-group .toggle-btn, #calc-race-group .toggle-btn').forEach(b => b.classList.remove('selected'));

                // Reset boolean toggles to "No"
                ['calc-bpmed-group', 'calc-diabetes-group', 'calc-smoker-group'].forEach(groupId => {
                    const group = $(`#${groupId}`);
                    if (group) {
                        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('selected'));
                        const noBtn = group.querySelector('[data-value="no"]');
                        if (noBtn) noBtn.classList.add('selected');
                    }
                });

                clearAllErrors('calc');
                $('#result-card').classList.add('hidden');
                const bmiCard = $('#bmi-result-card');
                if (bmiCard) bmiCard.classList.add('hidden');

                // Reset gauge needle
                const needle = $('#gauge-needle');
                if (needle) {
                    needle.style.transition = 'none';
                    needle.setAttribute('transform', 'rotate(0, 100, 100)');
                }

                showToast('Form reset', 'info');
            });
        }

        // Close result
        const closeBtn = $('#result-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                $('#result-card').classList.add('hidden');
            });
        }
    }

    // ==========================================
    // NAVIGATION LINKS
    // ==========================================
    function initNavLinks() {
        const gotoSignup = $('#goto-signup');
        if (gotoSignup) {
            gotoSignup.addEventListener('click', (e) => {
                e.preventDefault();
                clearAllErrors('login');
                navigateTo('signup');
            });
        }

        const gotoLogin = $('#goto-login');
        if (gotoLogin) {
            gotoLogin.addEventListener('click', (e) => {
                e.preventDefault();
                clearAllErrors('signup');
                navigateTo('login');
            });
        }

        const logoutBtn = $('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                clearCurrentUser();
                showToast('Signed out successfully', 'success');
                navigateTo('login');
            });
        }
    }

    // ==========================================
    // AUTO-LOGIN CHECK
    // ==========================================
    function checkSession() {
        const user = getCurrentUser();
        if (user) {
            $('#nav-user-name').textContent = user.name;
            navigateTo('calculator');
        } else {
            navigateTo('login');
        }
    }

    // ==========================================
    // ECHO UPLOAD LOGIC
    // ==========================================
    function initEchoUpload() {
        const dropZone = $('#echo-upload-zone');
        const fileInput = $('#echo-file-input');
        const browseBtn = $('#echo-upload-btn');
        const loader = $('#echo-upload-loader');

        if (!dropZone || !fileInput) return;

        browseBtn.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileUpload(fileInput.files[0]);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                handleFileUpload(fileInput.files[0]);
            }
        });

        function handleFileUpload(file) {
            if (!file) return;
            loader.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', file);

            fetch('http://localhost:8000/upload-echo-report', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                loader.classList.add('hidden');
                if (data.status === 'success' && data.extracted_parameters) {
                    const p = data.extracted_parameters;
                    if (p.ef) $('#calc-ef').value = p.ef;
                    if (p.lvedd) $('#calc-lvedd').value = p.lvedd;
                    if (p.lvesd) $('#calc-lvesd').value = p.lvesd;
                    showToast('Parameters extracted successfully', 'success');
                } else {
                    showToast('Failed to extract parameters', 'error');
                }
            })
            .catch(err => {
                loader.classList.add('hidden');
                console.error(err);
                showToast('OCR Service unavailable. Ensure backend is running.', 'error');
            });
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    function init() {
        initTogglePassword();
        initToggleGroups();
        initLoginForm();
        initSignupForm();
        initEchoUpload();
        initCalcForm();
        initNavLinks();
        checkSession();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
