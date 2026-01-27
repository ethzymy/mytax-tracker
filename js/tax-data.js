/**
 * Malaysia Tax Data - Based on LHDN Income Tax Act 1967 (YA 2024/2025)
 * Last Updated: November 2023
 */

const TAX_DATA = {
    // Personal Income Tax Rates for Residents (YA 2024)
    personalTaxBrackets: [
        { min: 0, max: 5000, rate: 0, cumulative: 0 },
        { min: 5001, max: 20000, rate: 0.01, cumulative: 0 },
        { min: 20001, max: 35000, rate: 0.03, cumulative: 150 },
        { min: 35001, max: 50000, rate: 0.06, cumulative: 600 },
        { min: 50001, max: 70000, rate: 0.11, cumulative: 1500 },
        { min: 70001, max: 100000, rate: 0.19, cumulative: 3700 },
        { min: 100001, max: 400000, rate: 0.25, cumulative: 9400 },
        { min: 400001, max: 600000, rate: 0.26, cumulative: 84400 },
        { min: 600001, max: 2000000, rate: 0.28, cumulative: 136400 },
        { min: 2000001, max: Infinity, rate: 0.30, cumulative: 528400 }
    ],

    // Non-resident flat rate
    nonResidentRate: 0.30,

    // SME Corporate Tax Rates
    smeTaxBrackets: [
        { min: 0, max: 150000, rate: 0.15 },
        { min: 150001, max: 600000, rate: 0.17 },
        { min: 600001, max: Infinity, rate: 0.24 }
    ],

    // Standard Corporate Rate
    corporateRate: 0.24,

    // Tax Relief Categories (Section 46-49, Income Tax Act 1967)
    taxReliefs: {
        automatic: [
            {
                id: 'self',
                name: 'Self & Dependent Relatives',
                nameMy: 'Individu dan saudara tanggungan',
                limit: 9000,
                description: 'Automatic personal relief',
                auto: true
            }
        ],
        family: [
            {
                id: 'spouse',
                name: 'Spouse (Non-working)',
                nameMy: 'Suami/Isteri (tiada pendapatan)',
                limit: 4000,
                description: 'For non-working spouse'
            },
            {
                id: 'spouse_disabled',
                name: 'Disabled Spouse',
                nameMy: 'Suami/Isteri OKU',
                limit: 5000,
                description: 'Additional for disabled spouse'
            },
            {
                id: 'child_under18',
                name: 'Child Under 18',
                nameMy: 'Anak bawah 18 tahun',
                limit: 2000,
                perUnit: true,
                description: 'Per unmarried child under 18'
            },
            {
                id: 'child_18plus_studying',
                name: 'Child 18+ (Tertiary Education)',
                nameMy: 'Anak 18+ (Pengajian tinggi)',
                limit: 8000,
                perUnit: true,
                description: 'Per child 18+ in diploma/degree'
            },
            {
                id: 'child_disabled',
                name: 'Disabled Child',
                nameMy: 'Anak OKU',
                limit: 6000,
                perUnit: true,
                description: 'Per disabled child'
            },
            {
                id: 'child_disabled_18plus',
                name: 'Disabled Child 18+ (Studying)',
                nameMy: 'Anak OKU 18+ (belajar)',
                limit: 14000,
                perUnit: true,
                description: 'Disabled child 18+ in tertiary edu'
            },
            {
                id: 'alimony',
                name: 'Alimony to Former Wife',
                nameMy: 'Nafkah kepada bekas isteri',
                limit: 4000,
                description: 'Payments to former wife'
            }
        ],
        medical: [
            {
                id: 'parents_medical',
                name: 'Parents Medical/Carer',
                nameMy: 'Perubatan/penjaga ibu bapa',
                limit: 8000,
                description: 'Medical treatment, special needs or carer for parents'
            },
            {
                id: 'serious_disease',
                name: 'Serious Disease Treatment',
                nameMy: 'Rawatan penyakit serius',
                limit: 10000,
                description: 'For self, spouse or child (includes fertility, vaccination RM1000, dental RM1000)'
            },
            {
                id: 'medical_checkup',
                name: 'Complete Medical Examination',
                nameMy: 'Pemeriksaan perubatan penuh',
                limit: 1000,
                description: 'Full medical checkup'
            },
            {
                id: 'dental',
                name: 'Dental Treatment',
                nameMy: 'Rawatan pergigian',
                limit: 1000,
                description: 'Dental examination and treatment'
            },
            {
                id: 'disabled_equipment',
                name: 'Disabled Support Equipment',
                nameMy: 'Peralatan sokongan OKU',
                limit: 6000,
                description: 'For self, spouse, child or parent'
            },
            {
                id: 'disabled_self',
                name: 'Disabled Individual',
                nameMy: 'Individu OKU',
                limit: 6000,
                description: 'If taxpayer is disabled'
            }
        ],
        education: [
            {
                id: 'education_self',
                name: 'Education Fees (Self)',
                nameMy: 'Yuran pendidikan (sendiri)',
                limit: 7000,
                description: 'Diploma/Degree/Masters/PhD or approved courses'
            },
            {
                id: 'sspn',
                name: 'SSPN Education Savings',
                nameMy: 'SSPN (Simpanan pendidikan)',
                limit: 8000,
                description: 'Net deposit in Skim Simpanan Pendidikan Nasional'
            },
            {
                id: 'child_learning_disability',
                name: 'Child Learning Disability',
                nameMy: 'Anak masalah pembelajaran',
                limit: 6000,
                description: 'For children with autism, ADHD, etc.'
            }
        ],
        lifestyle: [
            {
                id: 'lifestyle',
                name: 'Lifestyle',
                nameMy: 'Gaya hidup',
                limit: 2500,
                description: 'Books, computers, smartphones, tablets, internet'
            },
            {
                id: 'sports',
                name: 'Sports Equipment & Activities',
                nameMy: 'Peralatan & aktiviti sukan',
                limit: 1000,
                description: 'Sports equipment, gym membership, competitions'
            },
            {
                id: 'ev_charging',
                name: 'EV Charging Facilities',
                nameMy: 'Kemudahan pengecasan EV',
                limit: 2500,
                description: 'Electric vehicle charging equipment (not for business)'
            }
        ],
        insurance: [
            {
                id: 'life_insurance_epf',
                name: 'Life Insurance + EPF',
                nameMy: 'Insurans nyawa + KWSP',
                limit: 7000,
                description: 'Life insurance premium + EPF contribution (combined)'
            },
            {
                id: 'prs',
                name: 'Private Retirement Scheme',
                nameMy: 'Skim Persaraan Swasta',
                limit: 3000,
                description: 'Deferred annuity or PRS contributions'
            },
            {
                id: 'education_medical_insurance',
                name: 'Education/Medical Insurance',
                nameMy: 'Insurans pendidikan/perubatan',
                limit: 4000,
                description: 'Education or medical insurance for self, spouse, child'
            },
            {
                id: 'socso',
                name: 'SOCSO Contribution',
                nameMy: 'Caruman PERKESO',
                limit: 350,
                description: 'Social Security Organization contribution'
            }
        ]
    },

    // Tax Rebates (chargeable income <= RM35,000)
    taxRebates: {
        individual: 400,
        spouse: 400
    },

    // EPF rate
    epfEmployeeRate: 0.11,

    // Business Deductible Expenses (Allowable Expenses)
    businessDeductions: {
        operations: [
            {
                id: 'rent',
                name: 'Office/Shop Rent',
                nameMy: 'Sewa pejabat/kedai',
                deductionRate: 1.0,
                description: '100% deductible'
            },
            {
                id: 'utilities',
                name: 'Utilities (Electric/Water/Internet)',
                nameMy: 'Utiliti (elektrik/air/internet)',
                deductionRate: 1.0,
                description: '100% deductible'
            },
            {
                id: 'salaries',
                name: 'Employee Salaries & EPF',
                nameMy: 'Gaji pekerja & KWSP',
                deductionRate: 1.0,
                description: '100% deductible'
            },
            {
                id: 'professional_fees',
                name: 'Professional Fees (Accounting/Legal)',
                nameMy: 'Yuran profesional',
                deductionRate: 1.0,
                description: '100% deductible'
            }
        ],
        marketing: [
            {
                id: 'advertising',
                name: 'Advertising & Marketing',
                nameMy: 'Pengiklanan & pemasaran',
                deductionRate: 1.0,
                description: '100% deductible'
            },
            {
                id: 'entertainment',
                name: 'Entertainment Expenses',
                nameMy: 'Perbelanjaan hiburan',
                deductionRate: 0.5,
                description: '50% deductible only'
            }
        ],
        assets: [
            {
                id: 'small_assets',
                name: 'Small Assets (≤RM2,000 each)',
                nameMy: 'Aset kecil (≤RM2,000)',
                deductionRate: 1.0,
                description: '100% deductible if ≤RM2,000 per item'
            },
            {
                id: 'office_equipment',
                name: 'Office Equipment & Furniture',
                nameMy: 'Peralatan & perabot pejabat',
                deductionRate: 0.2,
                description: '20% capital allowance per year'
            },
            {
                id: 'computer_equipment',
                name: 'Computer & ICT Equipment',
                nameMy: 'Komputer & peralatan ICT',
                deductionRate: 0.4,
                description: '40% accelerated capital allowance'
            },
            {
                id: 'motor_vehicle',
                name: 'Motor Vehicle (Business Use)',
                nameMy: 'Kenderaan bermotor (kegunaan perniagaan)',
                deductionRate: 0.2,
                limit: 100000,
                description: '20% CA, max RM100,000'
            }
        ],
        other: [
            {
                id: 'charitable_donations',
                name: 'Charitable Donations',
                nameMy: 'Sumbangan amal',
                deductionRate: 1.0,
                limitPercent: 0.1,
                description: 'Max 10% of aggregate income'
            },
            {
                id: 'rd_expenses',
                name: 'R&D Expenses',
                nameMy: 'Perbelanjaan R&D',
                deductionRate: 2.0,
                description: 'Double deduction for approved R&D'
            },
            {
                id: 'training',
                name: 'Staff Training',
                nameMy: 'Latihan pekerja',
                deductionRate: 1.0,
                description: '100% deductible'
            },
            {
                id: 'insurance_business',
                name: 'Business Insurance',
                nameMy: 'Insurans perniagaan',
                deductionRate: 1.0,
                description: '100% deductible'
            }
        ],
        smeOnly: [
            {
                id: 'einvoice_system',
                name: 'e-Invoice System (YA 2024-2027)',
                nameMy: 'Sistem e-Invois',
                deductionRate: 1.0,
                limit: 50000,
                smeOnly: true,
                description: 'RM50,000/year for e-Invoice implementation'
            },
            {
                id: 'esg_expenditure',
                name: 'ESG Expenditure (YA 2024-2027)',
                nameMy: 'Perbelanjaan ESG',
                deductionRate: 1.0,
                limit: 50000,
                smeOnly: true,
                description: 'RM50,000/year for ESG-related costs'
            },
            {
                id: 'automation_equipment',
                name: 'Automation Equipment',
                nameMy: 'Peralatan automasi',
                deductionRate: 1.0,
                limit: 10000000,
                smeOnly: true,
                description: '100% CA on first RM10M'
            },
            {
                id: 'carbon_project',
                name: 'Carbon Credit Project',
                nameMy: 'Projek kredit karbon',
                deductionRate: 1.0,
                limit: 300000,
                smeOnly: true,
                description: 'RM300,000 for carbon project development'
            }
        ]
    }
};

// Freeze the data to prevent modification
Object.freeze(TAX_DATA);
Object.freeze(TAX_DATA.personalTaxBrackets);
Object.freeze(TAX_DATA.smeTaxBrackets);
Object.freeze(TAX_DATA.taxReliefs);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TAX_DATA;
}
