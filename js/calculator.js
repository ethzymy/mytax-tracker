/**
 * Malaysia Tax Calculator - Core Calculation Logic
 * Based on LHDN Income Tax Act 1967 (YA 2024/2025)
 */

class TaxCalculator {
    constructor() {
        this.taxData = TAX_DATA;
    }

    /**
     * Calculate personal income tax
     * @param {number} chargeableIncome - Income after deductions
     * @param {boolean} isResident - Tax residency status
     * @returns {object} Tax calculation result
     */
    calculatePersonalTax(chargeableIncome, isResident = true) {
        if (chargeableIncome <= 0) {
            return {
                taxPayable: 0,
                effectiveRate: 0,
                bracket: this.taxData.personalTaxBrackets[0],
                breakdown: []
            };
        }

        // Non-resident flat rate
        if (!isResident) {
            const tax = chargeableIncome * this.taxData.nonResidentRate;
            return {
                taxPayable: tax,
                effectiveRate: this.taxData.nonResidentRate * 100,
                bracket: { rate: this.taxData.nonResidentRate },
                breakdown: [{ range: 'All income', rate: '30%', tax: tax }]
            };
        }

        // Resident progressive tax
        let totalTax = 0;
        let remainingIncome = chargeableIncome;
        let currentBracket = null;
        const breakdown = [];

        for (const bracket of this.taxData.personalTaxBrackets) {
            if (chargeableIncome <= bracket.max) {
                currentBracket = bracket;
                break;
            }
        }

        // Calculate tax using cumulative method
        for (let i = 0; i < this.taxData.personalTaxBrackets.length; i++) {
            const bracket = this.taxData.personalTaxBrackets[i];

            if (chargeableIncome > bracket.min) {
                const taxableInBracket = Math.min(
                    chargeableIncome - bracket.min,
                    bracket.max - bracket.min
                );

                if (taxableInBracket > 0) {
                    const taxInBracket = taxableInBracket * bracket.rate;
                    totalTax += taxInBracket;

                    breakdown.push({
                        range: `RM ${bracket.min.toLocaleString()} - RM ${bracket.max === Infinity ? '∞' : bracket.max.toLocaleString()}`,
                        rate: `${(bracket.rate * 100).toFixed(0)}%`,
                        taxable: taxableInBracket,
                        tax: taxInBracket
                    });
                }
            }
        }

        const effectiveRate = chargeableIncome > 0 ? (totalTax / chargeableIncome) * 100 : 0;

        return {
            taxPayable: Math.round(totalTax * 100) / 100,
            effectiveRate: Math.round(effectiveRate * 100) / 100,
            bracket: currentBracket,
            breakdown: breakdown
        };
    }

    /**
     * Calculate chargeable income
     * @param {number} grossIncome - Total annual income
     * @param {number} epfContribution - EPF contribution
     * @param {object} reliefs - Object containing relief amounts
     * @returns {object} Chargeable income calculation
     */
    calculateChargeableIncome(grossIncome, epfContribution = 0, reliefs = {}) {
        // Use provided EPF or 0 if not specified (don't auto-calculate)
        const epf = epfContribution !== undefined && epfContribution !== null ? epfContribution : 0;

        // Sum all reliefs
        let totalReliefs = 0;
        const reliefBreakdown = [];

        // Automatic relief (self)
        const selfRelief = this.taxData.taxReliefs.automatic[0].limit;
        totalReliefs += selfRelief;
        reliefBreakdown.push({
            name: 'Self & Dependent Relatives',
            amount: selfRelief
        });

        // Add user-specified reliefs
        for (const [reliefId, amount] of Object.entries(reliefs)) {
            if (amount > 0) {
                const reliefInfo = this.findReliefById(reliefId);
                if (reliefInfo) {
                    const clampedAmount = Math.min(amount, reliefInfo.limit);
                    totalReliefs += clampedAmount;
                    reliefBreakdown.push({
                        name: reliefInfo.name,
                        amount: clampedAmount,
                        limit: reliefInfo.limit
                    });
                }
            }
        }

        // Calculate chargeable income
        const chargeableIncome = Math.max(0, grossIncome - epf - totalReliefs);

        return {
            grossIncome,
            epfContribution: epf,
            totalReliefs,
            chargeableIncome,
            reliefBreakdown
        };
    }

    /**
     * Find relief information by ID
     * @param {string} reliefId - Relief ID
     * @returns {object|null} Relief information
     */
    findReliefById(reliefId) {
        const categories = Object.values(this.taxData.taxReliefs);
        for (const category of categories) {
            const relief = category.find(r => r.id === reliefId);
            if (relief) return relief;
        }
        return null;
    }

    /**
     * Calculate tax rebate eligibility
     * @param {number} chargeableIncome - Chargeable income
     * @param {boolean} hasSpouse - Has non-working spouse
     * @returns {number} Total rebate amount
     */
    calculateRebate(chargeableIncome, hasSpouse = false) {
        if (chargeableIncome > 35000) {
            return 0;
        }

        let rebate = this.taxData.taxRebates.individual;
        if (hasSpouse) {
            rebate += this.taxData.taxRebates.spouse;
        }

        return rebate;
    }

    /**
     * Calculate SME corporate tax
     * @param {number} chargeableIncome - Company chargeable income
     * @param {boolean} isSME - Whether company qualifies as SME
     * @returns {object} Tax calculation result
     */
    calculateCorporateTax(chargeableIncome, isSME = true) {
        if (chargeableIncome <= 0) {
            return { taxPayable: 0, effectiveRate: 0 };
        }

        if (!isSME) {
            const tax = chargeableIncome * this.taxData.corporateRate;
            return {
                taxPayable: tax,
                effectiveRate: this.taxData.corporateRate * 100
            };
        }

        // SME tiered calculation
        let totalTax = 0;

        for (const bracket of this.taxData.smeTaxBrackets) {
            if (chargeableIncome > bracket.min) {
                const taxableInBracket = Math.min(
                    chargeableIncome - bracket.min,
                    bracket.max - bracket.min
                );
                totalTax += taxableInBracket * bracket.rate;
            }
        }

        const effectiveRate = (totalTax / chargeableIncome) * 100;

        return {
            taxPayable: Math.round(totalTax * 100) / 100,
            effectiveRate: Math.round(effectiveRate * 100) / 100
        };
    }

    /**
     * Full tax calculation
     * @param {object} params - All input parameters
     * @returns {object} Complete tax calculation result
     */
    calculateFullTax(params) {
        const {
            grossIncome = 0,
            epfContribution = 0,
            reliefs = {},
            isResident = true,
            maritalStatus = 'single',
            spouseWorking = true
        } = params;

        // Calculate chargeable income
        const incomeCalc = this.calculateChargeableIncome(grossIncome, epfContribution, reliefs);

        // Calculate tax
        const taxCalc = this.calculatePersonalTax(incomeCalc.chargeableIncome, isResident);

        // Calculate rebate
        const hasNonWorkingSpouse = maritalStatus === 'married' && !spouseWorking;
        const rebate = this.calculateRebate(incomeCalc.chargeableIncome, hasNonWorkingSpouse);

        // Final tax after rebate
        const finalTax = Math.max(0, taxCalc.taxPayable - rebate);

        return {
            ...incomeCalc,
            ...taxCalc,
            rebate,
            finalTax,
            monthlyTax: finalTax / 12
        };
    }

    /**
     * Get all relief categories with items
     * @returns {object} Relief categories
     */
    getReliefCategories() {
        return this.taxData.taxReliefs;
    }

    /**
     * Calculate potential tax savings from a relief
     * @param {number} reliefAmount - Amount of relief claimed
     * @param {number} currentChargeableIncome - Current chargeable income
     * @returns {number} Potential tax savings
     */
    calculateReliefSavings(reliefAmount, currentChargeableIncome) {
        const currentTax = this.calculatePersonalTax(currentChargeableIncome, true).taxPayable;
        const newTax = this.calculatePersonalTax(currentChargeableIncome - reliefAmount, true).taxPayable;
        return currentTax - newTax;
    }
}

// Create global instance
const taxCalculator = new TaxCalculator();
