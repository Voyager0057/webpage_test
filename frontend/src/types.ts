export type RepaymentMethod = 'ANNUITY' | 'EQUAL_PRINCIPAL';
export type BonusMode = 'AUTO' | 'SEPARATE' | 'COMBINED';
export interface Scenario {
  city: string; district: string; taxYear: number; monthlySalary: string; monthlyPerformance: string; monthlyAllowance: string;
  annualBonus: string; bonusEligible: boolean; bonusMonth: number; bonusTaxMode: BonusMode;
  socialInsuranceMode: 'CONFIRMED_AMOUNT' | 'BASE_RATE'; confirmedMonthlySocial: string; socialInsuranceBase: string; employeePensionRate: string; employeeMedicalRate: string;
  employeeUnemploymentRate: string; pfBase: string; pfEmployeeRate: string;
  pfEmployerRate: string; pfBalance: string; pfLoanLimit: string; pfEligible: boolean;
  confirmedPfBaseCeiling: string; pfContributionMonths: number; confirmedMaxLoanYears: number; firstPfLoan: boolean; pfWithdrawalConfirmed: boolean; maxMonthlyPayment: string; firstHome: boolean; mortgageDeduction: boolean; mortgageDeductionMonthsUsed: number;
  otherMonthlyDeductions: string; housePrice: string; downPaymentRate: string;
  loanYears: number; pfLoanAmount: string; commercialAnnualRate: string;
  pfAnnualRate: string; repaymentMethod: RepaymentMethod; providentUsage: 'NONE' | 'MONTHLY_OFFSET';
  monthlyLivingCost: string; minMonthlyCash: string; annualDiscountRate: string; annualInflationRate: string;
}
export interface Summary {
  annualGrossIncome: string; annualTax: string; annualTakeHome: string; annualMortgagePayment: string;
  annualWithheldTax: string; annualSettlementRefund: string;
  annualPfOffset: string; annualCashAfterMortgage: string; annualDisposableCash: string;
  minimumMonthlyCash: string; firstMonthlyPayment: string; maxMonthlyPayment: string;
  totalInterest: string; totalRepayment: string; commercialPrincipal: string; pfPrincipal: string;
  totalLoan: string; downPayment: string; endingPfBalance: string; presentValueCost: string;
  realPaymentCost: string; comparisonHorizonMonths: number; loanYears: number;
  repaymentMethod: string; bonusTaxMode: string;
}
export interface MonthlyRow {
  month: number; label: string; grossIncome: string; employeeSocial: string; employeePf: string;
  employerPf: string; taxableIncome: string; cumulativeTaxableIncome: string; tax: string;
  takeHome: string; mortgagePayment: string; pfOffset: string; cashAfterMortgage: string;
  livingCost: string; disposableCash: string; pfBalance: string; remainingPrincipal: string; openingPfBalance: string; mortgageDeduction: string;
}
export interface ScheduleRow {
  month: number; payment: string; principal: string; interest: string;
  commercialPayment: string; pfPayment: string; remainingPrincipal: string;
  commercialPrincipal: string; commercialInterest: string; commercialBalance: string;
  pfPrincipal: string; pfInterest: string; pfRemainingPrincipal: string;
}
export interface CalculationResult {
  input: Scenario; summary: Summary; monthly: MonthlyRow[]; schedule: ScheduleRow[];
  feasible: boolean; violations: string[]; warnings: string[]; assumptions: string[];
  policyVersion: string; engineVersion: string;
  bonusComparison: { selectedMode: string; separateTax: string; combinedTax: string };
}
export interface Plan {
  rank: number; scenario: Scenario; summary: Summary; score: string; explanations: string[];
}
export interface OptimizationResult {
  searchSettings: {minYears: number; maxYears: number; minPfAmount: string; maxPfAmount: string; pfStep: string; methods: string[]};
  objective: string; status: string; baseline: CalculationResult; plans: Plan[];
  pareto: { loanYears: number; pfLoanAmount: string; paymentMethod: string; annualDisposableCash: string; totalInterest: string; presentValueCost: string }[];
  evaluatedCount: number; feasibleCount: number; rejectedCount: number;
  rejectionReasons: Record<string, number>; elapsedMs: number; searchDescription: string;
}
export interface Policy {
  version: string; city: string; label: string; verifiedAt: string; scope: string | string[];
  assumptions: string[]; reviewStatus: string; districts: Record<string, string>; changes: {date: string; description: string}[];
  references: { id: string; title: string; url: string; note: string; issuer: string; effectiveFrom: string; reviewStatus: string }[]; rules: Record<string, unknown>;
}
export interface Example { id: string; name: string; description: string; scenario: Scenario }
export interface SensitivityResult {
  parameter: string;
  points: { value: string; feasible: boolean; annualDisposableCash: string; totalInterest: string; presentValueCost: string; minimumMonthlyCash: string; annualGrossIncome: string; annualTax: string; annualTakeHome: string; realPaymentCost: string; annualCashAfterMortgage: string; scenario: Scenario; violations: string[] }[];
  assumption: string;
}
export const defaultScenario: Scenario = {
  city: 'NINGBO', district: 'YINZHOU', taxYear: 2026, monthlySalary: '30000', monthlyPerformance: '0', monthlyAllowance: '0',
  annualBonus: '60000', bonusEligible: true, bonusMonth: 12, bonusTaxMode: 'AUTO', socialInsuranceMode: 'CONFIRMED_AMOUNT', confirmedMonthlySocial: '3150', socialInsuranceBase: '30000',
  employeePensionRate: '0.08', employeeMedicalRate: '0.02', employeeUnemploymentRate: '0.005',
  pfBase: '30000', pfEmployeeRate: '0.07', pfEmployerRate: '0.07', pfBalance: '100000',
  confirmedPfBaseCeiling: '38907', pfContributionMonths: 24, confirmedMaxLoanYears: 30, firstPfLoan: true, pfWithdrawalConfirmed: true, maxMonthlyPayment: '0',
  pfLoanLimit: '1000000', pfEligible: true, firstHome: true, mortgageDeduction: true,
  mortgageDeductionMonthsUsed: 0, otherMonthlyDeductions: '0', housePrice: '3000000',
  downPaymentRate: '0.30', loanYears: 30, pfLoanAmount: '1000000', commercialAnnualRate: '0.031',
  pfAnnualRate: '0.026', repaymentMethod: 'ANNUITY', providentUsage: 'MONTHLY_OFFSET',
  monthlyLivingCost: '6000', minMonthlyCash: '1000', annualDiscountRate: '0.03', annualInflationRate: '0.02',
};

export interface SavedPlan { id: string; name: string; calculation: CalculationResult }
