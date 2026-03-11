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
}
