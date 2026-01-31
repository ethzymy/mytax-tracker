/**
 * MYTax Tracker - Main Application
 */

class MYTaxApp {
    constructor() {
        window.app = this;
        this.calculator = taxCalculator;
        this.userData = this.loadUserData();
        this.incomeType = this.userData.activeMode || 'employee';
        this.lang = localStorage.getItem('mytax-lang') || null;
        this.init();
    }

    init() {
        this.incomeType = 'employee'; // Default
        this.initLanguage();
        this.checkDisclaimer();
        this.bindEvents();
        this.bindMenuEvents();
        this.bindInfoTooltips();
        this.updateSetupUI();
        this.registerServiceWorker();
    }

    // ===== Language Management =====
    initLanguage() {
        const langModal = document.getElementById('languageModal');
        if (!this.lang) {
            langModal.classList.remove('hidden');
        } else {
            langModal.classList.add('hidden');
            this.translateUI();
        }

        // Bind language options
        document.querySelectorAll('.lang-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedLang = btn.dataset.lang;
                this.setLanguage(selectedLang);
                langModal.classList.add('hidden');

                // If disclaimer not accepted, show it after language selection
                if (!localStorage.getItem('disclaimerAccepted')) {
                    document.getElementById('disclaimerModal').classList.remove('hidden');
                }
            });
        });

        // Toggle language from menu
        document.getElementById('menuLangBtn')?.addEventListener('click', () => {
            langModal.classList.remove('hidden');
            document.getElementById('menuDropdown').classList.remove('show');
        });
    }

    bindMenuEvents() {
        const menuBtn = document.getElementById('menuBtn');
        const dropdown = document.getElementById('menuDropdown');

        if (menuBtn && dropdown) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }

        // Menu theme toggle
        document.getElementById('menuThemeBtn')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    setLanguage(lang) {
        this.lang = lang;
        localStorage.setItem('mytax-lang', lang);
        this.translateUI();

        // Re-render dynamic content
        if (this.incomeType) {
            this.renderReliefCategories();
            this.renderBusinessDeductions();
            this.updateCalculations();
        }
    }

    translateUI() {
        const lang = this.lang || 'en';
        const translations = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS['en'];

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });

        // Update specific tooltips or titles
        const langSwitchBtn = document.getElementById('langSwitchBtn');
        if (langSwitchBtn) {
            const titles = { en: "Switch Language", ms: "Tukar Bahasa", zh: "切换语言" };
            langSwitchBtn.title = titles[lang] || titles.en;
        }

        // Update Theme Menu Text
        this.updateThemeMenuText();
    }

    // ===== Disclaimer Modal =====
    checkDisclaimer() {
        const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
        const modal = document.getElementById('disclaimerModal');

        // Only show disclaimer if lang is already selected
        if (disclaimerAccepted || !this.lang) {
            modal.classList.add('hidden');
        } else {
            modal.classList.remove('hidden');
        }

        // Bind accept button
        document.getElementById('acceptDisclaimer').addEventListener('click', () => {
            const dontShowAgain = document.getElementById('dontShowAgain').checked;
            if (dontShowAgain) {
                localStorage.setItem('disclaimerAccepted', 'true');
            }
            modal.classList.add('hidden');
        });
    }

    // ===== Info Tooltip =====
    bindInfoTooltips() {
        const infoIcon = document.getElementById('reliefInfoIcon');
        const tooltip = document.getElementById('reliefInfoTooltip');

        if (infoIcon && tooltip) {
            infoIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                tooltip.classList.toggle('show');
            });

            // Close tooltip when clicking outside
            document.addEventListener('click', () => {
                tooltip.classList.remove('show');
            });
        }
    }


    // ===== Event Bindings =====
    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab-btn')));
        });

        // Income type selection
        document.querySelectorAll('input[name="incomeType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const newType = e.target.value;
                if (newType === this.incomeType) return;

                // 1. Save current state before switching
                this.saveActiveModeState();

                // 2. CRITICAL: Clear ALL calculation variables to prevent cross-contamination
                this.calculatedIncome = null;
                this.businessIncomeForPersonal = 0;

                // 3. Clear businessDeductions to prevent cross-mode contamination
                this.userData.businessDeductions = {};

                // 4. Reset business income UI inputs
                const chargeableInput = document.getElementById('chargeableBusinessIncome');
                const revenueInput = document.getElementById('annualRevenue');
                if (chargeableInput) chargeableInput.value = '';
                if (revenueInput) revenueInput.value = '';

                // 5. Reset all deduction input fields
                document.querySelectorAll('.deduction-input').forEach(input => {
                    input.value = '';
                });

                // 3. Switch type
                this.incomeType = newType;
                this.userData.activeMode = newType;

                // 4. Load target state
                this.loadActiveModeState();

                this.updateSetupUI();
                this.updateIncomeSectionVisibility();
                this.updateCalculations();
                // Also refresh business calculations and summary for all modes
                this.updateBusinessCalculations();
                this.updateTaxSummary();
                this.saveUserData();
            });
        });

        // Continue button
        document.getElementById('startBtn')?.addEventListener('click', () => this.startFromSetup());

        // Personal info
        document.getElementById('residencyStatus')?.addEventListener('change', () => this.updateCalculations());
        document.getElementById('maritalStatus')?.addEventListener('change', (e) => {
            this.toggleSpouseSection(e.target.value);
            this.updateCalculations();
        });
        document.getElementById('spouseWorking')?.addEventListener('change', () => this.updateCalculations());

        // Income inputs - auto-calculate annual income
        document.getElementById('monthlySalary')?.addEventListener('input', () => this.calculateAnnualIncome());
        document.getElementById('bonusMonths')?.addEventListener('input', () => this.calculateAnnualIncome());
        document.getElementById('otherIncome')?.addEventListener('input', () => this.calculateAnnualIncome());
        document.getElementById('epfRate')?.addEventListener('input', () => this.calculateAnnualIncome());
        document.getElementById('zakatInput')?.addEventListener('input', () => this.updateCalculations());

        // Business income inputs
        document.getElementById('annualRevenue')?.addEventListener('input', () => {
            this.updateBusinessDeductionTotals();
            this.updateBusinessCalculations();
            this.updateTaxSummary(); // Real-time summary update for Company mode
        });

        // Sole Proprietor EPF Self-Contribution
        document.getElementById('soleEpfMonthly')?.addEventListener('input', (e) => {
            const monthly = parseFloat(e.target.value) || 0;
            const annual = Math.min(monthly * 12, 4000); // Cap at RM 4,000/year
            const annualDisplay = document.getElementById('soleEpfAnnual');
            if (annualDisplay) {
                annualDisplay.textContent = `RM ${annual.toLocaleString()}`;
            }
            this.updateCalculations();
            this.saveUserData();
        });

        document.getElementById('companyType')?.addEventListener('change', (e) => {
            this.updateBusinessTypeUI(e.target.value);
            this.updateBusinessCalculations();
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());

        // Load saved theme
        this.loadTheme();
    }

    // ===== Setup UI Logic =====
    updateSetupUI() {
        const personalSection = document.getElementById('personalInfoSection');
        const companySection = document.getElementById('companyInfoSection');
        const companyTypeSelect = document.getElementById('companyType');
        const paidUpCapitalGroup = document.getElementById('paidUpCapital')?.closest('.form-group');

        if (this.incomeType === 'company') {
            personalSection?.classList.add('hidden');
            companySection?.classList.remove('hidden');
            if (paidUpCapitalGroup) paidUpCapitalGroup.classList.remove('hidden');

            if (companyTypeSelect) {
                Array.from(companyTypeSelect.options).forEach(opt => {
                    const isCorp = opt.value === 'sdn-bhd' || opt.value === 'llp';
                    opt.hidden = !isCorp;
                    opt.disabled = !isCorp;
                });
                if (companyTypeSelect.value === 'sole-prop' || companyTypeSelect.value === 'partnership') {
                    companyTypeSelect.value = 'sdn-bhd';
                }
            }
        } else if (this.incomeType === 'enterprise') {
            personalSection?.classList.remove('hidden');
            companySection?.classList.remove('hidden');
            if (paidUpCapitalGroup) paidUpCapitalGroup.classList.add('hidden');

            if (companyTypeSelect) {
                Array.from(companyTypeSelect.options).forEach(opt => {
                    const isEnterprise = opt.value === 'sole-prop' || opt.value === 'partnership';
                    opt.hidden = !isEnterprise;
                    opt.disabled = !isEnterprise;
                });
                if (companyTypeSelect.value === 'sdn-bhd' || companyTypeSelect.value === 'llp') {
                    companyTypeSelect.value = 'sole-prop';
                }
            }
        } else {
            // Employee mode
            personalSection?.classList.remove('hidden');
            companySection?.classList.add('hidden');
        }

        // Trigger business UI update based on current selection
        if (companyTypeSelect) {
            this.updateBusinessTypeUI(companyTypeSelect.value);
        }
    }

    startFromSetup() {
        // Update tabs based on income type
        this.updateTabVisibility();

        // Render appropriate content
        if (this.incomeType === 'employee' || this.incomeType === 'enterprise') {
            this.renderReliefCategories();
        }
        if (this.incomeType === 'enterprise' || this.incomeType === 'company') {
            this.renderBusinessDeductions();
        }

        // Navigate to income tab
        const incomeTab = document.querySelector('[data-tab="income"]');
        if (incomeTab) this.switchTab(incomeTab);

        // Update income section visibility
        this.updateIncomeSectionVisibility();

        // Initialize calculations
        this.updateCalculations();
    }

    updateTabVisibility() {
        const tabReliefs = document.getElementById('tabReliefs');

        // Reliefs tab: only for employee and enterprise
        if (tabReliefs) {
            if (this.incomeType === 'company') {
                tabReliefs.style.display = 'none';
            } else {
                tabReliefs.style.display = '';
            }
        }
    }

    updateIncomeSectionVisibility() {
        const employeeSection = document.getElementById('employeeIncomeSection');
        const businessSection = document.getElementById('businessIncomeSection');
        const businessSummaryCard = document.getElementById('businessSummaryCard');

        if (employeeSection) {
            employeeSection.style.display = this.incomeType === 'employee' ? 'block' : 'none';
        }
        if (businessSection) {
            businessSection.style.display = this.incomeType !== 'employee' ? 'block' : 'none';
        }
        // Business Tax Summary card: only for Company (Sdn Bhd / LLP)
        if (businessSummaryCard) {
            businessSummaryCard.style.display = this.incomeType === 'company' ? 'block' : 'none';
        }
        // SME Savings row in Summary: only for Company
        const smeSavingsRow = document.getElementById('smeSavingsRow');
        if (smeSavingsRow) {
            smeSavingsRow.style.display = this.incomeType === 'company' ? 'flex' : 'none';
        }

        // Monthly savings tip: only for employee and enterprise
        const monthlySavingsTipRow = document.getElementById('monthlySavingsTipRow');
        if (monthlySavingsTipRow) {
            monthlySavingsTipRow.style.display = this.incomeType === 'company' ? 'none' : 'flex';
        }
    }

    // ===== Tab Navigation =====
    switchTab(btn) {
        if (!btn) return;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show corresponding content
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`)?.classList.add('active');
    }

    // ===== Theme Management =====
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('mytax-theme', newTheme);

        this.updateThemeMenuText();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('mytax-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeMenuText();
    }

    updateThemeMenuText() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const lang = this.lang || 'en';
        const icon = document.getElementById('menuThemeIcon');
        const text = document.getElementById('menuThemeText');

        if (icon && text) {
            if (currentTheme === 'dark') {
                icon.textContent = '☀️';
                text.textContent = lang === 'zh' ? '开启浅色模式' : (lang === 'ms' ? 'Mod Terang' : 'Light Mode');
            } else {
                icon.textContent = '🌙';
                text.textContent = lang === 'zh' ? '开启深色模式' : (lang === 'ms' ? 'Mod Gelap' : 'Dark Mode');
            }
        }
    }

    // ===== Spouse Section Toggle =====
    toggleSpouseSection(maritalStatus) {
        const spouseSection = document.getElementById('spouseSection');
        if (spouseSection) {
            if (maritalStatus === 'married') {
                spouseSection.classList.remove('hidden');
            } else {
                spouseSection.classList.add('hidden');
            }
        }
    }

    // ===== Auto-Calculate Annual Income =====
    calculateAnnualIncome() {
        const monthlySalary = parseFloat(document.getElementById('monthlySalary')?.value) || 0;
        const bonusMonths = parseFloat(document.getElementById('bonusMonths')?.value) || 0;
        const otherIncome = parseFloat(document.getElementById('otherAnnualIncome')?.value) || 0;
        const epfRate = parseFloat(document.getElementById('epfRate')?.value) || 11;

        // Persist to namespace immediately
        if (this.userData.namespaces?.employee) {
            const ns = this.userData.namespaces.employee;
            ns.monthlySalary = monthlySalary;
            ns.bonusMonths = bonusMonths;
            ns.otherIncome = otherIncome;
            ns.epfRate = epfRate;
        }

        // Calculate components
        const annualSalary = monthlySalary * 12;
        const annualBonus = monthlySalary * bonusMonths;
        const grossAnnualIncome = annualSalary + annualBonus + otherIncome;

        // EPF calculation
        const epfableIncome = annualSalary + annualBonus;
        const epfContribution = Math.min(epfableIncome * (epfRate / 100), 4000);

        // Update display
        const update = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        update('annualSalary', `RM ${annualSalary.toLocaleString()}`);
        update('annualBonus', `RM ${annualBonus.toLocaleString()}`);
        update('otherIncomeDisplay', `RM ${otherIncome.toLocaleString()}`);
        update('annualIncome', `RM ${grossAnnualIncome.toLocaleString()}`);
        update('epfContribution', `- RM ${epfContribution.toLocaleString()}`);

        // Store for tax calculation (Legacy field, but keeping for compatibility)
        this.calculatedIncome = {
            gross: grossAnnualIncome,
            epf: epfContribution
        };

        this.updateCalculations();
    }

    // ===== Relief Categories Rendering =====
    renderReliefCategories() {
        const container = document.getElementById('reliefCategories');
        if (!container) return;

        const categories = this.calculator.getReliefCategories();
        const lang = this.lang || 'en';
        const categoryNames = {
            automatic: { name: { en: 'Automatic Reliefs', ms: 'Pelepasan Automatik', zh: '自动减免' }, icon: '✅' },
            family: { name: { en: 'Family & Dependents', ms: 'Keluarga & Tanggungan', zh: '家庭与受抚养人' }, icon: '👨‍👩‍👧‍👦' },
            medical: { name: { en: 'Medical & Health', ms: 'Perubatan & Kesihatan', zh: '医疗与健康' }, icon: '🏥' },
            education: { name: { en: 'Education', ms: 'Pendidikan', zh: '教育' }, icon: '🎓' },
            lifestyle: { name: { en: 'Lifestyle', ms: 'Gaya Hidup', zh: '生活方式' }, icon: '🎯' },
            insurance: { name: { en: 'Insurance & Savings', ms: 'Insurans & Simpanan', zh: '保险与储蓄' }, icon: '🛡️' }
        };

        container.innerHTML = '';

        for (const [categoryId, items] of Object.entries(categories)) {
            if (categoryId === 'automatic') continue; // Skip automatic reliefs in editing

            const categoryInfo = categoryNames[categoryId] || { name: { en: categoryId }, icon: '📋' };
            const displayName = categoryInfo.name[lang] || categoryInfo.name.en;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'relief-category';
            categoryEl.innerHTML = `
                <div class="relief-category-header" onclick="app.toggleCategory(this)">
                    <div class="relief-category-title">
                        <span>${categoryInfo.icon}</span>
                        <span>${displayName}</span>
                    </div>
                    <span class="relief-category-amount" id="category-total-${categoryId}">RM 0</span>
                </div>
                <div class="relief-category-items">
                    ${items.map(item => this.renderReliefItem(item)).join('')}
                </div>
            `;
            container.appendChild(categoryEl);
        }
    }

    renderReliefItem(item) {
        const savedValue = this.userData.reliefs?.[item.id] || 0;
        const lang = this.lang || 'en';

        // Get translated name and description
        const name = lang === 'ms' ? (item.nameMy || item.name) : (lang === 'zh' ? (item.nameCn || item.name) : item.name);
        const desc = lang === 'ms' ? (item.descriptionMy || item.description) : (lang === 'zh' ? (item.descriptionCn || item.description) : item.description);
        const limitText = lang === 'ms' ? 'Had' : (lang === 'zh' ? '上限' : 'Limit');
        const perPersonText = lang === 'ms' ? ' setiap orang' : (lang === 'zh' ? ' 每人' : ' per person');

        return `
            <div class="relief-item">
                <div class="relief-item-info">
                    <div class="relief-item-name">${name}</div>
                    <div class="relief-item-limit">${desc} (${limitText}: RM ${item.limit.toLocaleString()}${item.perUnit ? perPersonText : ''})</div>
                </div>
                <div class="relief-item-input">
                    <div class="input-with-prefix">
                        <span class="input-prefix">RM</span>
                        <input type="number" 
                               class="form-input" 
                               id="relief-${item.id}"
                               data-relief-id="${item.id}"
                               data-limit="${item.limit}"
                               value="${savedValue}"
                               min="0"
                               max="${item.limit}"
                               placeholder="0"
                               onchange="app.onReliefChange(this)">
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (savedValue / item.limit) * 100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleCategory(header) {
        const category = header.closest('.relief-category');
        category.classList.toggle('expanded');
    }

    onReliefChange(input) {
        const reliefId = input.dataset.reliefId;
        const limit = parseFloat(input.dataset.limit);
        let value = parseFloat(input.value) || 0;

        // Clamp to limit
        if (value > limit) {
            value = limit;
            input.value = value;
        }

        // Update progress bar
        const progressFill = input.closest('.relief-item').querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, (value / limit) * 100)}%`;
        }

        // Save to namespace
        if (!this.userData.reliefs) this.userData.reliefs = {};
        this.userData.reliefs[reliefId] = value;

        this.saveUserData();
        this.updateCalculations();
    }

    // ===== Business Deductions Rendering =====
    renderBusinessDeductions() {
        const container = document.getElementById('businessDeductionCategories');
        if (!container) return;

        // For Enterprise (Sole Prop/Partnership), they are NOT corporate entities
        // Only Company type uses the businessType dropdown
        let isCorpType = false;
        if (this.incomeType === 'company') {
            const businessType = document.getElementById('businessType')?.value || 'sdn-bhd';
            isCorpType = businessType === 'sdn-bhd' || businessType === 'llp';
        }
        // Enterprise (sole-prop/partnership) is never corporate type

        const categories = TAX_DATA.businessDeductions;
        const lang = this.lang || 'en';
        const categoryNames = {
            operations: { name: { en: 'Operations', ms: 'Operasi', zh: '营运' }, icon: '🏢' },
            marketing: { name: { en: 'Marketing & Entertainment', ms: 'Pemasaran & Hiburan', zh: '营销与应酬' }, icon: '📢' },
            assets: { name: { en: 'Assets & Equipment', ms: 'Aset & Peralatan', zh: '资产与设备' }, icon: '💻' },
            other: { name: { en: 'Other Deductions', ms: 'Potongan Lain', zh: '其他扣除项' }, icon: '📋' },
            smeOnly: { name: { en: 'SME Special Incentives (YA 2024-2027)', ms: 'Insentif Khas PKS', zh: '中小企业特别奖励' }, icon: '🌟' }
        };

        container.innerHTML = '';

        for (const [categoryId, items] of Object.entries(categories)) {
            // Skip smeOnly category for non-corporate entities
            if (categoryId === 'smeOnly' && !isCorpType) {
                continue;
            }

            const categoryInfo = categoryNames[categoryId] || { name: { en: categoryId }, icon: '📋' };
            const displayName = categoryInfo.name[lang] || categoryInfo.name.en;

            const categoryEl = document.createElement('div');
            categoryEl.className = 'relief-category';

            // Add special styling for SME category
            if (categoryId === 'smeOnly') {
                categoryEl.classList.add('sme-special');
            }

            categoryEl.innerHTML = `
                <div class="relief-category-header" onclick="app.toggleCategory(this)">
                    <div class="relief-category-title">
                        <span>${categoryInfo.icon}</span>
                        <span>${displayName}</span>
                        ${categoryId === 'smeOnly' ? `<span class="badge badge-sme">${lang === 'zh' ? '仅限中小企业' : (lang === 'ms' ? 'PKS Sahaja' : 'SME Only')}</span>` : ''}
                    </div>
                    <span class="relief-category-amount" id="deduction-total-${categoryId}">RM 0</span>
                </div>
                <div class="relief-category-items">
                    ${items.map(item => this.renderDeductionItem(item)).join('')}
                </div>
            `;
            container.appendChild(categoryEl);
        }
    }

    renderDeductionItem(item) {
        const savedValue = this.userData.deductions?.[item.id] || 0;
        const lang = this.lang || 'en';

        const rateText = item.deductionRate === 1.0 ? '100%' :
            item.deductionRate === 0.5 ? '50%' :
                item.deductionRate === 2.0 ? (lang === 'zh' ? '200%（双倍）' : (lang === 'ms' ? '200% (Ganda)' : '200% (Double)')) :
                    `${(item.deductionRate * 100).toFixed(0)}% CA`;

        const name = lang === 'ms' ? (item.nameMy || item.name) : (lang === 'zh' ? (item.nameCn || item.name) : item.name);
        const desc = lang === 'ms' ? (item.descriptionMy || item.description) : (lang === 'zh' ? (item.descriptionCn || item.description) : item.description);

        return `
            <div class="relief-item">
                <div class="relief-item-info">
                    <div class="relief-item-name">${name}</div>
                    <div class="relief-item-limit">${desc} (${rateText})</div>
                </div>
                <div class="relief-item-input">
                    <div class="input-with-prefix">
                        <span class="input-prefix">RM</span>
                        <input type="number" 
                               class="form-input" 
                               id="deduction-${item.id}"
                               data-deduction-id="${item.id}"
                               data-rate="${item.deductionRate}"
                               value="${savedValue}"
                               min="0"
                               placeholder="0"
                               onchange="app.onDeductionChange(this)">
                    </div>
                </div>
            </div>
        `;
    }

    onDeductionChange(input) {
        const deductionId = input.dataset.deductionId;
        let value = parseFloat(input.value) || 0;

        // Save and recalculate
        if (!this.userData.businessDeductions) this.userData.businessDeductions = {};
        this.userData.businessDeductions[deductionId] = value;

        this.saveUserData();
        this.updateBusinessDeductionTotals();
        this.updateBusinessCalculations();
        this.updateCalculations();
    }

    updateBusinessDeductionTotals() {
        const deductions = this.userData.businessDeductions || {};
        const categories = TAX_DATA.businessDeductions;
        let totalDeductions = 0;
        let totalAllowable = 0;

        for (const [categoryId, items] of Object.entries(categories)) {
            let categoryTotal = 0;
            let categoryAllowable = 0;

            for (const item of items) {
                const amount = deductions[item.id] || 0;
                const allowable = amount * item.deductionRate;
                categoryTotal += amount;
                categoryAllowable += allowable;
            }

            const el = document.getElementById(`deduction-total-${categoryId}`);
            if (el) {
                el.textContent = `RM ${categoryTotal.toLocaleString()}`;
            }

            totalDeductions += categoryTotal;
            totalAllowable += categoryAllowable;
        }

        // Update summary
        const totalEl = document.getElementById('totalBusinessDeductions');
        if (totalEl) totalEl.textContent = `RM ${totalAllowable.toLocaleString()}`;

        // Calculate tax saved using actual tax rates
        const savingsEl = document.getElementById('businessDeductionSavings');
        if (savingsEl) {
            const businessType = document.getElementById('businessType')?.value || 'sdn-bhd';
            const isCorpType = businessType === 'sdn-bhd' || businessType === 'llp';
            const isSoleProp = businessType === 'sole-prop' || businessType === 'partnership';

            let estimatedSavings = 0;

            if (isSoleProp) {
                // Sole Prop: Use marginal personal tax rate (estimate at 20% for middle income)
                // For more accuracy, use the actual marginal rate based on income
                const marginalRate = 0.19; // Assume 70k-100k bracket as common case
                estimatedSavings = totalAllowable * marginalRate;
                savingsEl.textContent = `RM ${estimatedSavings.toLocaleString()} (@ 19%)`;
            } else {
                // Corporate: Check SME status
                const paidUpCapital = parseFloat(document.getElementById('paidUpCapital')?.value) || 0;
                const annualRevenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;
                const isSME = paidUpCapital <= 2500000 && annualRevenue <= 50000000;

                if (isSME) {
                    // SME tiered calculation
                    // Deductions typically save at the marginal rate (highest applicable tier)
                    const chargeableIncome = parseFloat(document.getElementById('chargeableBusinessIncome')?.value) || 0;

                    let marginalRate = 0.15; // Default: first tier
                    if (chargeableIncome > 600000) {
                        marginalRate = 0.24; // Above 600k
                    } else if (chargeableIncome > 150000) {
                        marginalRate = 0.17; // 150k-600k
                    }

                    estimatedSavings = totalAllowable * marginalRate;
                    savingsEl.textContent = `RM ${estimatedSavings.toLocaleString()} (@ ${(marginalRate * 100).toFixed(0)}%)`;
                } else {
                    // Non-SME: Flat 24%
                    estimatedSavings = totalAllowable * 0.24;
                    savingsEl.textContent = `RM ${estimatedSavings.toLocaleString()} (@ 24%)`;
                }
            }
        }

        // Auto-update chargeable business income
        const revenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;
        const chargeableInput = document.getElementById('chargeableBusinessIncome');
        if (chargeableInput && revenue > 0) {
            const calculatedChargeable = Math.max(0, revenue - totalAllowable);
            chargeableInput.value = calculatedChargeable;
            chargeableInput.placeholder = `Auto: ${calculatedChargeable.toLocaleString()}`;
        }

        return { totalDeductions, totalAllowable };
    }

    // ===== Calculations =====
    updateCalculations() {
        let grossIncome = 0;
        let epfContribution = 0;

        // CRITICAL: Each mode is COMPLETELY ISOLATED. No cross-mode aggregation.
        if (this.incomeType === 'employee') {
            // Employee mode: ONLY salary data
            grossIncome = this.calculatedIncome?.gross || 0;
            epfContribution = this.calculatedIncome?.epf || 0;
        } else if (this.incomeType === 'enterprise') {
            // Enterprise mode: ONLY business income (no salary)
            const chargeableBusinessIncome = parseFloat(document.getElementById('chargeableBusinessIncome')?.value) || 0;
            grossIncome = chargeableBusinessIncome;
            // Sole Proprietor EPF Self-Contribution (capped at RM 4,000/year)
            const soleEpfMonthly = parseFloat(document.getElementById('soleEpfMonthly')?.value) || 0;
            epfContribution = Math.min(soleEpfMonthly * 12, 4000);
        } else if (this.incomeType === 'company') {
            // Company mode: Corporate tax calculation is handled separately
            // Personal tax summary is hidden, so we can set these to 0
            grossIncome = 0;
            epfContribution = 0;
        }

        const isResident = document.getElementById('residencyStatus')?.value !== 'non-resident';
        const maritalStatus = document.getElementById('maritalStatus')?.value || 'single';
        const spouseWorking = document.getElementById('spouseWorking')?.value === 'yes';

        // Get all relief values
        const reliefs = this.userData.reliefs || {};

        // Add spouse relief if applicable (only for personal tax modes)
        if ((this.incomeType === 'employee' || this.incomeType === 'enterprise') && maritalStatus === 'married' && !spouseWorking) {
            reliefs.spouse = 4000;
        } else {
            delete reliefs.spouse;
        }

        // Zakat
        const zakat = parseFloat(document.getElementById('zakatInput')?.value) || 0;

        // Perform Personal Tax Calculation
        const result = this.calculator.calculateFullTax({
            grossIncome,
            epfContribution,
            reliefs,
            zakat,
            isResident,
            maritalStatus,
            spouseWorking
        });

        // Update UI & Summary
        this.updateQuickEstimate(result);
        this.updateReliefSummary(result);
        this.updateTaxSummary(result);
        this.updateReliefProgress(result);
        this.updateCategoryTotals();
        this.updateOptimizationTips(result);

        // Save metadata
        this.userData.lastCalculatedRecord = {
            mode: this.incomeType,
            timestamp: Date.now()
        };

        // Final save to localStorage
        localStorage.setItem('mytax-user-data', JSON.stringify(this.userData));
    }

    updateQuickEstimate(result) {
        const chargeableEl = document.getElementById('chargeableIncome');
        const taxEl = document.getElementById('taxPayable');
        const rateEl = document.getElementById('effectiveRate');

        if (chargeableEl) chargeableEl.textContent = `RM ${result.chargeableIncome.toLocaleString()}`;
        if (taxEl) taxEl.textContent = `RM ${result.finalTax.toLocaleString()}`;
        if (rateEl) rateEl.textContent = `${result.effectiveRate.toFixed(1)}%`;
    }

    updateReliefSummary(result) {
        const totalEl = document.getElementById('totalReliefsUsed');
        const savingsEl = document.getElementById('potentialSavings');

        if (totalEl) totalEl.textContent = `RM ${result.totalReliefs.toLocaleString()}`;

        if (savingsEl) {
            const taxWithoutReliefs = this.calculator.calculatePersonalTax(
                result.grossIncome - result.epfContribution - 9000, // Only auto relief
                true
            ).taxPayable;
            const savings = Math.max(0, taxWithoutReliefs - result.finalTax);
            savingsEl.textContent = `RM ${savings.toLocaleString()}`;
        }
    }

    updateTaxSummary(result) {
        const update = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // Personal Tax Summary
        update('summaryIncome', `RM ${result.grossIncome.toLocaleString()}`);
        update('summaryEpf', `- RM ${result.epfContribution.toLocaleString()}`);
        update('summaryReliefs', `- RM ${result.totalReliefs.toLocaleString()}`);

        const zakatRow = document.getElementById('summaryZakatRow');
        if (zakatRow) {
            if (result.zakat > 0) {
                zakatRow.style.display = 'flex';
                update('summaryZakat', `- RM ${result.zakat.toLocaleString()}`);
            } else {
                zakatRow.style.display = 'none';
            }
        }

        const personalSummaryCard = document.getElementById('personalSummaryCard');
        const businessSummaryCard = document.getElementById('businessSummaryCard');
        const reliefProgressCard = document.getElementById('reliefProgressCard');
        const optimizationCard = document.getElementById('optimizationCard');

        // Show/Hide summary cards based on incomeType (NOT businessType dropdown)
        // Employee & Enterprise = Personal Tax Summary, Company = Business Tax Summary
        const showPersonal = this.incomeType === 'employee' || this.incomeType === 'enterprise';

        if (personalSummaryCard) personalSummaryCard.style.display = showPersonal ? 'block' : 'none';
        if (businessSummaryCard) businessSummaryCard.style.display = showPersonal ? 'none' : 'block';

        // Hide personal-tax-only cards when in Company mode
        if (reliefProgressCard) reliefProgressCard.style.display = showPersonal ? 'block' : 'none';
        if (optimizationCard) optimizationCard.style.display = showPersonal ? 'block' : 'none';

        // Update Personal Tax specific summary fields if in Personal or Enterprise mode
        if (showPersonal) {
            update('summaryChargeable', `RM ${result.chargeableIncome.toLocaleString()}`);
            update('summaryTax', `RM ${result.finalTax.toLocaleString()}`);
        }

        const chargeableBusinessIncome = parseFloat(document.getElementById('chargeableBusinessIncome')?.value) || 0;
        const paidUpCapital = parseFloat(document.getElementById('paidUpCapital')?.value) || 0;
        const annualRevenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;

        const isSME = paidUpCapital <= 2500000 && annualRevenue <= 50000000;
        const isCompanyMode = this.incomeType === 'company';

        let businessTax = 0;
        let smeSavings = 0;

        if (isCompanyMode && chargeableBusinessIncome > 0) {
            const businessResult = this.calculator.calculateCorporateTax(chargeableBusinessIncome, isSME);
            businessTax = businessResult.taxPayable;

            // Calculate SME savings (vs standard 24%)
            if (isSME) {
                const standardTax = chargeableBusinessIncome * 0.24;
                smeSavings = Math.max(0, standardTax - businessTax);
            }
        }

        // Business Tax Summary
        const lang = this.lang || 'en';
        const businessType = document.getElementById('companyType')?.value || 'sdn-bhd';
        const businessTypeNames = {
            'sdn-bhd': lang === 'zh' ? '私人有限公司 (Sdn Bhd)' : (lang === 'ms' ? 'Syarikat (Sdn Bhd)' : 'Sdn Bhd'),
            'llp': lang === 'zh' ? '有限责任合伙 (LLP)' : (lang === 'ms' ? 'Perkongsian Liabiliti Terhad (LLP)' : 'LLP'),
            'sole-prop': lang === 'zh' ? '独资企业' : (lang === 'ms' ? 'Pemilik Tunggal' : 'Sole Proprietor'),
            'partnership': lang === 'zh' ? '合伙企业' : (lang === 'ms' ? 'Perkongsian' : 'Partnership')
        };
        update('summaryBusinessType', businessTypeNames[businessType] || businessType);
        update('summaryBusinessIncome', `RM ${chargeableBusinessIncome.toLocaleString()}`);

        const smeEligibleText = lang === 'zh' ? '符合资格 ✓' : (lang === 'ms' ? 'Layak ✓' : 'Eligible ✓');
        const smeNotEligibleText = lang === 'zh' ? '不符合资格' : (lang === 'ms' ? 'Tidak Layak' : 'Not Eligible');
        const personalTaxText = lang === 'zh' ? '使用个人所得税' : (lang === 'ms' ? 'Guna Cukai Peribadi' : 'Use Personal');

        update('summarySmeStatus', isCompanyMode ? (isSME ? smeEligibleText : smeNotEligibleText) : 'N/A');
        update('summaryBusinessTax', isCompanyMode ? `RM ${businessTax.toLocaleString()}` : personalTaxText);

        // Total Tax Overview - ISOLATED by mode
        let totalTax = 0;
        if (this.incomeType === 'employee' || this.incomeType === 'enterprise') {
            totalTax = result.finalTax; // Personal tax only
        } else if (this.incomeType === 'company') {
            totalTax = businessTax; // Corporate tax only
        }
        update('totalTaxPayable', `RM ${totalTax.toLocaleString()}`);
        update('monthlyTax', `RM ${(totalTax / 12).toLocaleString()}`);

        // Savings Calculation
        const taxWithoutReliefs = this.calculator.calculatePersonalTax(
            result.grossIncome - result.epfContribution - 9000,
            true
        ).taxPayable;
        const reliefSavings = Math.max(0, taxWithoutReliefs - result.finalTax);

        const totalSavings = reliefSavings + smeSavings;

        update('savingsFromReliefs', `RM ${reliefSavings.toLocaleString()}`);
        update('savingsFromSme', `RM ${smeSavings.toLocaleString()}`);
        update('totalPotentialSavings', `RM ${totalSavings.toLocaleString()}`);
        update('totalSavings', `RM ${totalSavings.toLocaleString()}`);

        // Monthly savings calculation
        const monthlySavings = totalSavings / 12;
        update('monthlySavingsValue', `RM ${monthlySavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

        // Update bracket display
        const bracketDisplay = document.getElementById('taxBracketDisplay');
        if (bracketDisplay && result.bracket) {
            const rate = (result.bracket.rate * 100).toFixed(0);
            const min = result.bracket.min.toLocaleString();
            const max = result.bracket.max === Infinity ? '∞' : result.bracket.max.toLocaleString();
            bracketDisplay.innerHTML = `
                <span class="bracket-rate">${rate}%</span>
                <span class="bracket-range">RM ${min} - RM ${max}</span>
            `;
        }
    }

    updateReliefProgress(result) {
        const container = document.getElementById('reliefProgressList');
        if (!container) return;

        const lang = this.lang || 'en';
        container.innerHTML = result.reliefBreakdown.map(relief => {
            // Find the original relief object to get translated names
            const originalRelief = this.calculator.findReliefById(relief.id) ||
                (relief.id === 'self' ? TAX_DATA.taxReliefs.automatic[0] : null);

            let displayName = relief.name;
            if (originalRelief) {
                displayName = lang === 'ms' ? (originalRelief.nameMy || originalRelief.name) :
                    (lang === 'zh' ? (originalRelief.nameCn || originalRelief.name) : originalRelief.name);
            }

            return `
                <div class="relief-progress-item">
                    <div class="relief-progress-header">
                        <span class="relief-progress-name">${displayName}</span>
                        <span class="relief-progress-amount">RM ${relief.amount.toLocaleString()}${relief.limit ? ` / ${relief.limit.toLocaleString()}` : ''}</span>
                    </div>
                    ${relief.limit ? `
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (relief.amount / relief.limit) * 100)}%"></div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    updateCategoryTotals() {
        const reliefs = this.userData.reliefs || {};
        const categories = this.calculator.getReliefCategories();

        for (const [categoryId, items] of Object.entries(categories)) {
            if (categoryId === 'automatic') continue;

            let total = 0;
            for (const item of items) {
                total += reliefs[item.id] || 0;
            }

            const el = document.getElementById(`category-total-${categoryId}`);
            if (el) {
                el.textContent = `RM ${total.toLocaleString()}`;
            }
        }
    }

    /**
     * Update Tax Optimization Tips based on unused relief limits
     * @param {object} result - Calculation result
     */
    updateOptimizationTips(result) {
        const container = document.getElementById('optimizationCard');
        const list = document.getElementById('optimizationTipsList');
        if (!container || !list) return;

        const lang = this.lang || 'en';
        const tips = [];
        const marginalRate = result.bracket.rate / 100;

        // If tax is already 0, no need for tips unless there's still taxable income
        if (result.finalTax <= 0 && result.chargeableIncome <= 0) {
            container.classList.add('hidden');
            return;
        }

        const checkRelief = (id, icon, nameObj) => {
            const reliefInfo = this.calculator.findReliefById(id);
            if (!reliefInfo) return;
            const currentAmount = this.userData.reliefs?.[id] || 0;
            const remaining = Math.max(0, reliefInfo.limit - currentAmount);

            if (remaining > 50) {
                const possibleSavings = this.calculator.calculateReliefSavings(remaining, result.chargeableIncome);
                if (possibleSavings >= 10) {
                    const name = nameObj[lang] || nameObj.en;
                    const tipText = {
                        en: `You could save up to RM ${possibleSavings.toFixed(0)} more by maximizing ${name} (RM ${remaining.toLocaleString()} balance).`,
                        ms: `Anda boleh jimat sehingga RM ${possibleSavings.toFixed(0)} lagi dengan memaksimumkan ${name} (baki RM ${remaining.toLocaleString()}).`,
                        zh: `通过用尽 ${name} 额度（剩余 RM ${remaining.toLocaleString()}），您最高可再省税 RM ${possibleSavings.toFixed(0)}。`
                    };
                    tips.push({ icon, text: tipText[lang] || tipText.en });
                }
            }
        };

        // Key high-impact reliefs to check
        checkRelief('lifestyle', '📚', { en: 'Lifestyle Relief', ms: 'Gaya Hidup', zh: '生活方式减免' });
        checkRelief('sports', '🏸', { en: 'Sports Equipment', ms: 'Peralatan Sukan', zh: '运动器材减免' });
        checkRelief('sspn', '🎓', { en: 'SSPN Savings', ms: 'Simpanan SSPN', zh: 'SSPN 教育储蓄' });
        checkRelief('prs', '🛡️', { en: 'PRS Savings', ms: 'Simpanan PRS', zh: 'PRS 退休计划' });

        // Specific hint for medical checkup
        const medicalCheckup = this.calculator.findReliefById('medical_checkup');
        if (medicalCheckup) {
            const current = this.userData.reliefs?.['medical_checkup'] || 0;
            const remaining = medicalCheckup.limit - current;
            if (remaining >= 500) {
                const possibleSavings = this.calculator.calculateReliefSavings(remaining, result.chargeableIncome);
                if (possibleSavings >= 10) {
                    const tipText = {
                        en: `A medical checkup before year-end could save you RM ${possibleSavings.toFixed(0)} in tax.`,
                        ms: `Pemeriksaan perubatan sebelum hujung tahun boleh menjimatkan cukai sebanyak RM ${possibleSavings.toFixed(0)}.`,
                        zh: `年度结束前进行体检，最高可为您省税 RM ${possibleSavings.toFixed(0)}。`
                    };
                    tips.push({ icon: '🏥', text: tipText[lang] || tipText.en });
                }
            }
        }

        if (tips.length > 0) {
            container.classList.remove('hidden');
            list.innerHTML = tips.map(tip => `
                <div class="tip-item">
                    <span class="tip-icon">${tip.icon}</span>
                    <p class="tip-text">${tip.text}</p>
                </div>
            `).join('');
        } else {
            container.classList.add('hidden');
        }
    }

    // ===== Data Persistence =====
    loadUserData() {
        try {
            const saved = localStorage.getItem('mytax-user-data');
            let data = saved ? JSON.parse(saved) : null;

            // Migration / Initialization
            if (!data || !data.namespaces) {
                const oldReliefs = data?.reliefs || {};
                data = {
                    activeMode: 'employee',
                    namespaces: {
                        employee: { monthlySalary: 0, bonusMonths: 0, otherIncome: 0, epfRate: 0.11 },
                        enterprise: { revenue: 0, businessType: 'sole-prop' },
                        company: { revenue: 0, capital: 0, businessType: 'sdn-bhd' }
                    },
                    reliefs: oldReliefs,
                    businessDeductions: {}
                };
            }
            return data;
        } catch {
            return {
                activeMode: 'employee',
                namespaces: {
                    employee: { monthlySalary: 0, bonusMonths: 0, otherIncome: 0, epfRate: 0.11 },
                    enterprise: { revenue: 0, businessType: 'sole-prop' },
                    company: { revenue: 0, capital: 0, businessType: 'sdn-bhd' }
                },
                reliefs: {},
                businessDeductions: {}
            };
        }
    }

    saveUserData() {
        try {
            this.saveActiveModeState(); // Final harvest before saving
            localStorage.setItem('mytax-user-data', JSON.stringify(this.userData));
        } catch (e) {
            console.warn('Could not save user data:', e);
        }
    }

    saveActiveModeState() {
        if (!this.userData.namespaces) return;
        const mode = this.incomeType;
        const ns = this.userData.namespaces[mode];

        if (mode === 'employee') {
            ns.monthlySalary = parseFloat(document.getElementById('monthlySalary')?.value) || 0;
            ns.bonusMonths = parseFloat(document.getElementById('bonusMonths')?.value) || 0;
            ns.otherIncome = parseFloat(document.getElementById('otherAnnualIncome')?.value) || 0;
            ns.epfRate = parseFloat(document.getElementById('epfRate')?.value) || 0.11;
        } else if (mode === 'enterprise') {
            ns.revenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;
            ns.businessType = document.getElementById('companyType')?.value || 'sole-prop';
        } else if (mode === 'company') {
            ns.revenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;
            ns.capital = parseFloat(document.getElementById('paidUpCapital')?.value) || 0;
            ns.businessType = document.getElementById('companyType')?.value || 'sdn-bhd';
        }
    }

    loadActiveModeState() {
        if (!this.userData.namespaces) return;
        const mode = this.incomeType;
        const ns = this.userData.namespaces[mode];

        if (mode === 'employee') {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            set('monthlySalary', ns.monthlySalary || '');
            set('bonusMonths', ns.bonusMonths || '');
            set('otherAnnualIncome', ns.otherIncome || '');
            set('epfRate', ns.epfRate || 0.11);
            this.calculateAnnualIncome(); // Sync internals
        } else if (mode === 'enterprise' || mode === 'company') {
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            set('annualRevenue', ns.revenue || '');
            set('paidUpCapital', ns.capital || '');
            set('companyType', ns.businessType);
            this.updateBusinessDeductionTotals(); // Sync internals
        }
    }

    // ===== Business Tax Methods =====
    updateBusinessTypeUI(businessType) {
        const infoBox = document.getElementById('businessTypeInfo');
        const corporateSection = document.getElementById('corporateSection');
        const corporateTaxBreakdown = document.getElementById('corporateTaxBreakdown');
        const businessDeductionsCard = document.getElementById('businessDeductionsCard');
        const businessDeductionCategories = document.getElementById('businessDeductionCategories');

        const isCorpType = businessType === 'sdn-bhd' || businessType === 'llp';
        const isSoleProp = businessType === 'sole-prop' || businessType === 'partnership';

        if (infoBox) {
            if (isCorpType) {
                infoBox.innerHTML = `
                    <p><strong>Sdn Bhd / LLP:</strong> Taxed at corporate rate (15-24%)</p>
                    <p>SME Rate applies if: Paid-up capital ≤ RM2.5M, Revenue ≤ RM50M</p>
                    <p class="text-warning">⚠️ Cannot use personal tax reliefs</p>
                `;
            } else {
                infoBox.innerHTML = `
                    <p><strong>${businessType === 'sole-prop' ? 'Sole Proprietor' : 'Partnership'}:</strong> Taxed as personal income (0-30%)</p>
                    <p>✅ You can use <strong>Personal Tax Reliefs</strong> in the Reliefs tab!</p>
                    <p>Business expenses below will reduce your business income.</p>
                `;
            }
        }

        // Corporate-specific sections
        if (corporateSection) {
            corporateSection.style.display = isCorpType ? 'block' : 'none';
        }
        if (corporateTaxBreakdown) {
            corporateTaxBreakdown.style.display = isCorpType ? 'block' : 'none';
        }

        // Show/Hide EPF Self-Contribution for Sole Proprietors
        const soleEpfSection = document.getElementById('soleEpfSection');
        if (soleEpfSection) {
            soleEpfSection.style.display = isSoleProp ? 'block' : 'none';
        }

        // Show Business Tax Estimate card ONLY for Company mode (Sdn Bhd / LLP)
        const businessTaxEstimateCard = document.getElementById('businessTaxEstimateCard');
        if (businessTaxEstimateCard) {
            businessTaxEstimateCard.style.display = isCorpType ? 'block' : 'none';
        }

        // Business deductions are available for ALL business types
        if (businessDeductionsCard) {
            businessDeductionsCard.style.display = 'block';
            // Update the title based on business type using i18n
            const title = businessDeductionsCard.querySelector('.card-title');
            if (title) {
                const lang = this.lang || 'en';
                const translations = TAX_DATA.translations[lang] || TAX_DATA.translations.en;
                if (isSoleProp) {
                    title.textContent = '💼 ' + (translations.business_expenses_sole || 'Business Expenses (Reduces Taxable Income)');
                } else {
                    title.textContent = '💼 ' + (translations.allowable_expenses_corp || 'Allowable Expenses (Corporate Deductions)');
                }
            }
        }
        if (businessDeductionCategories) {
            businessDeductionCategories.style.display = 'block';
        }

        // Re-render deductions based on business type (to show/hide SME items)
        this.renderBusinessDeductions();
        this.updateBusinessDeductionTotals();
        this.updateBusinessCalculations();
    }


    updateBusinessCalculations() {
        const businessType = document.getElementById('companyType')?.value || 'sdn-bhd';
        const isCorpType = businessType === 'sdn-bhd' || businessType === 'llp';
        const isSoleProp = businessType === 'sole-prop' || businessType === 'partnership';

        const chargeableIncome = parseFloat(document.getElementById('chargeableBusinessIncome')?.value) || 0;

        if (isSoleProp) {
            // For sole proprietor/partnership - sync to personal tax
            const update = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            update('smeStatus', 'N/A (Personal Tax)');

            if (chargeableIncome > 0) {
                // Calculate using personal tax rates
                const personalTaxResult = this.calculator.calculatePersonalTax(chargeableIncome, true);
                update('businessTaxPayable', `RM ${personalTaxResult.taxPayable.toLocaleString()}`);
                update('businessEffectiveRate', `${personalTaxResult.effectiveRate.toFixed(1)}%`);

                // Store for summary sync
                this.businessIncomeForPersonal = chargeableIncome;
            } else {
                update('businessTaxPayable', 'RM 0');
                update('businessEffectiveRate', '0%');
                this.businessIncomeForPersonal = 0;
            }

            // Update personal tax calculation with business income
            this.updateCalculations();

            // Explicitly update the business estimate card UI for Sole Prop
            const businessTaxEstimateCard = document.getElementById('corporateTaxBreakdown');
            if (businessTaxEstimateCard) {
                // For Sole Prop, we might want to hide the corporate-specific breakdown
                // but keep the main estimate card visible
                const smeStatusTag = document.getElementById('smeStatus');
                if (smeStatusTag) smeStatusTag.textContent = 'N/A (Personal Tax)';
            }
            return;
        }

        const paidUpCapital = parseFloat(document.getElementById('paidUpCapital')?.value) || 0;
        const annualRevenue = parseFloat(document.getElementById('annualRevenue')?.value) || 0;

        // Determine SME status
        const isSME = paidUpCapital <= 2500000 && annualRevenue <= 50000000;

        // Calculate corporate tax
        const result = this.calculator.calculateCorporateTax(chargeableIncome, isSME);

        // Calculate tier breakdown for SME
        let tier1Tax = 0, tier2Tax = 0, tier3Tax = 0;
        if (isSME && chargeableIncome > 0) {
            // Tier 1: First 150,000 @ 15%
            const tier1Income = Math.min(chargeableIncome, 150000);
            tier1Tax = tier1Income * 0.15;

            // Tier 2: 150,001 - 600,000 @ 17%
            if (chargeableIncome > 150000) {
                const tier2Income = Math.min(chargeableIncome - 150000, 450000);
                tier2Tax = tier2Income * 0.17;
            }

            // Tier 3: Above 600,000 @ 24%
            if (chargeableIncome > 600000) {
                const tier3Income = chargeableIncome - 600000;
                tier3Tax = tier3Income * 0.24;
            }
        } else if (!isSME && chargeableIncome > 0) {
            tier3Tax = chargeableIncome * 0.24;
        }

        // Update UI
        const update = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        update('smeStatus', isSME ? 'Eligible ✓' : 'Not Eligible');
        update('businessTaxPayable', `RM ${result.taxPayable.toLocaleString()}`);
        update('businessEffectiveRate', `${result.effectiveRate.toFixed(1)}%`);
        update('taxTier1', `RM ${tier1Tax.toLocaleString()}`);
        update('taxTier2', `RM ${tier2Tax.toLocaleString()}`);
        update('taxTier3', `RM ${tier3Tax.toLocaleString()}`);
        update('totalCorporateTax', `RM ${result.taxPayable.toLocaleString()}`);

        // Update breakdown title based on SME status
        const breakdownTitle = document.querySelector('#corporateTaxBreakdown .card-title');
        if (breakdownTitle) {
            breakdownTitle.textContent = isSME ? 'Tax Breakdown (SME)' : 'Tax Breakdown (Standard 24%)';
        }
    }

    // ===== Excel Export =====
    exportToExcel() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const yearAssessment = 2024;

        // Get all current data
        const grossIncome = this.calculatedIncome?.gross || 0;
        const epfContribution = this.calculatedIncome?.epf || 0;
        const monthlySalary = parseFloat(document.getElementById('monthlySalary')?.value) || 0;
        const bonusMonths = parseFloat(document.getElementById('bonusMonths')?.value) || 0;
        const otherIncome = parseFloat(document.getElementById('otherIncome')?.value) || 0;
        const reliefs = this.userData.reliefs || {};
        const deductions = this.userData.deductions || {};

        // Sheet 1: Taxpayer Summary
        const summaryData = [
            ['MALAYSIA INCOME TAX RECORD'],
            ['Year of Assessment (YA)', yearAssessment],
            ['Generated Date', dateStr],
            [''],
            ['TAXPAYER INFORMATION'],
            ['Residency Status', document.getElementById('residencyStatus')?.value || 'resident'],
            ['Marital Status', document.getElementById('maritalStatus')?.value || 'single'],
            [''],
            ['INCOME SUMMARY'],
            ['Monthly Salary (RM)', monthlySalary],
            ['Number of Salary Months', 12],
            ['Bonus Months', bonusMonths],
            ['Annual Salary (RM)', monthlySalary * 12],
            ['Annual Bonus (RM)', monthlySalary * bonusMonths],
            ['Other Income (RM)', otherIncome],
            ['Gross Annual Income (RM)', grossIncome],
            [''],
            ['STATUTORY DEDUCTIONS'],
            ['EPF Contribution (RM)', epfContribution],
            [''],
            ['TAX CALCULATION'],
            ['Total Tax Reliefs (RM)', Object.values(reliefs).reduce((a, b) => a + b, 0)],
            ['Chargeable Income (RM)', document.getElementById('summaryChargeable')?.textContent || 'RM 0'],
            ['Tax Payable (RM)', document.getElementById('summaryTax')?.textContent || 'RM 0'],
        ];

        // Sheet 2: Personal Tax Reliefs
        const reliefsData = [
            ['TAX RELIEFS CLAIMED - YA ' + yearAssessment],
            [''],
            ['Relief Category', 'Amount Claimed (RM)', 'Maximum Limit (RM)', 'Section'],
            ['Self & Dependent Relatives', 9000, 9000, 'Section 46(1)(a)'],
        ];

        // Add user-entered reliefs
        const allReliefs = TAX_DATA.taxReliefs;
        for (const category of Object.values(allReliefs)) {
            for (const relief of category) {
                if (reliefs[relief.id] && reliefs[relief.id] > 0) {
                    reliefsData.push([relief.name, reliefs[relief.id], relief.limit, 'Section 46']);
                }
            }
        }

        reliefsData.push(['']);
        reliefsData.push(['TOTAL RELIEFS CLAIMED', Object.values(reliefs).reduce((a, b) => a + b, 0) + 9000]);

        // Sheet 3: Business Deductions (if applicable)
        const businessType = document.getElementById('businessType')?.value || 'sdn-bhd';
        const businessIncome = parseFloat(document.getElementById('chargeableBusinessIncome')?.value) || 0;

        const businessData = [
            ['BUSINESS INCOME & DEDUCTIONS - YA ' + yearAssessment],
            [''],
            ['Business Type', businessType === 'sdn-bhd' ? 'Sdn Bhd (Private Limited)' :
                businessType === 'llp' ? 'LLP (Limited Liability Partnership)' :
                    businessType === 'sole-prop' ? 'Sole Proprietor' : 'Partnership'],
            [''],
            ['ALLOWABLE EXPENSES'],
            ['Expense Category', 'Amount (RM)', 'Deduction Rate', 'Allowable (RM)'],
        ];

        // Add business deductions
        let totalDeductions = 0;
        const allDeductions = TAX_DATA.businessDeductions;
        for (const [categoryId, items] of Object.entries(allDeductions)) {
            for (const item of items) {
                if (deductions[item.id] && deductions[item.id] > 0) {
                    const allowable = deductions[item.id] * item.deductionRate;
                    businessData.push([item.name, deductions[item.id], `${item.deductionRate * 100}%`, allowable]);
                    totalDeductions += allowable;
                }
            }
        }

        businessData.push(['']);
        businessData.push(['TOTAL ALLOWABLE DEDUCTIONS', '', '', totalDeductions]);
        businessData.push(['']);
        businessData.push(['Gross Business Revenue', parseFloat(document.getElementById('annualRevenue')?.value) || 0]);
        businessData.push(['Less: Allowable Deductions', totalDeductions]);
        businessData.push(['Chargeable Business Income', businessIncome]);
        businessData.push(['Business Tax Payable', document.getElementById('businessTaxPayable')?.textContent || 'RM 0']);

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Add sheets
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        const ws2 = XLSX.utils.aoa_to_sheet(reliefsData);
        const ws3 = XLSX.utils.aoa_to_sheet(businessData);

        // Set column widths
        ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
        ws2['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];
        ws3['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

        XLSX.utils.book_append_sheet(wb, ws1, 'Tax Summary');
        XLSX.utils.book_append_sheet(wb, ws2, 'Tax Reliefs');
        XLSX.utils.book_append_sheet(wb, ws3, 'Business Deductions');

        // Generate filename
        const filename = `MYTax_Record_YA${yearAssessment}_${dateStr}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
    }

    // ===== Service Worker =====

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (e) {
                console.warn('Service Worker registration failed:', e);
            }
        }
    }
}


// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MYTaxApp();
});
