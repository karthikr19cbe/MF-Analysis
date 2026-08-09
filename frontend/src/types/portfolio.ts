export interface FileParsed {
  filename: string;
  scheme_count: number;
  date_detected: string;
  holdings_count: number;
}

export interface Meta {
  generated_at: string;
  file_count: number;
  files_parsed: FileParsed[];
  total_schemes: number;
  total_unique_stocks: number;
}

export interface FundHolding {
  scheme_name: string;
  amc: string;
  date: string;
  quantity: number;
  market_value_lakhs: number;
  pct_of_net_assets: number;
}

export interface Stock {
  isin: string | null;
  name: string;
  name_variants: string[];
  sector: string;
  asset_class: string;
  total_market_value_lakhs: number;
  weighted_avg_pct: number;
  fund_count: number;
  funds: FundHolding[];
  /** Persisted market-cap classification (derived backend-side across all periods). */
  market_cap?: 'Large Cap' | 'Mid Cap' | 'Small Cap';
}

export interface Sector {
  total_market_value_lakhs: number;
  stock_count: number;
  weighted_avg_pct: number;
}

export interface CashEquivalents {
  cash: number;
  reverse_repo: number;
  treps: number;
  treasury_bills: number;
  government_securities: number;
  fixed_deposit: number;
  certificate_of_deposit: number;
  commercial_paper: number;
  net_receivables: number;
  net_current_assets: number;
  other: number;
  total_lakhs: number;
  pct_of_net_assets: number;
}

export interface Fund {
  amc: string;
  date: string;
  total_aum_lakhs: number;
  holding_count: number;
  cash_and_equivalents: CashEquivalents;
}

export interface HHI {
  by_stock: number;
  by_sector: number;
  interpretation: string;
}

export interface AssetClass {
  total_market_value_lakhs: number;
  holding_count: number;
  weighted_avg_pct: number;
}

export interface HighConviction {
  isin: string | null;
  name: string;
  fund_count: number;
  total_funds: number;
  appearance_pct: number;
  avg_weight_pct: number;
  total_market_value_lakhs: number;
  sector: string;
  asset_class: string;
}

export interface Concentration {
  hhi: HHI;
  top_10_weight_pct: number;
  high_conviction: HighConviction[];
}

export interface LiquiditySummary {
  total_cash_lakhs: number;
  total_aum_lakhs: number;
  cash_pct: number;
}

export interface PortfolioData {
  meta: Meta;
  stocks: Record<string, Stock>;
  sectors: Record<string, Sector>;
  asset_classes: Record<string, AssetClass>;
  funds: Record<string, Fund>;
  concentration: Concentration;
  liquidity_summary: LiquiditySummary;
  // Multi-period fields
  periods?: Record<string, PeriodSummary>;
  comparisons?: Record<string, ComparisonData>;
  current_period?: string;
  period_keys?: string[];
  period_labels?: Record<string, string>;
}

export interface PeriodSummary {
  label: string;
  meta: Meta;
  funds: Record<string, { amc: string; total_aum_lakhs: number; holding_count: number }>;
  concentration: Concentration;
  liquidity_summary: LiquiditySummary;
}

export interface StockComparison {
  name: string;
  isin: string | null;
  sector: string;
  asset_class: string;
  status: 'New' | 'Exit' | 'Inc' | 'Dec' | 'Hold';
  prev_market_value_lakhs: number | null;
  curr_market_value_lakhs: number | null;
  prev_pct: number | null;
  curr_pct: number | null;
  delta_pct: number;
  prev_quantity: number | null;
  curr_quantity: number | null;
}

export interface FundComparison {
  fund_name: string;
  amc: string;
  prev_period: string;
  curr_period: string;
  prev_aum_lakhs: number;
  curr_aum_lakhs: number;
  total_stocks: number;
  counts: {
    new: number;
    exit: number;
    inc: number;
    dec: number;
    hold: number;
  };
  stocks: StockComparison[];
  prev_asset_allocation: Record<string, number>;
  curr_asset_allocation: Record<string, number>;
}

export interface ComparisonData {
  prev_period: string;
  curr_period: string;
  prev_label: string;
  curr_label: string;
  funds: Record<string, FundComparison>;
}
