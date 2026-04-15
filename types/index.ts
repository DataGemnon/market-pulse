export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
  currency?: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
}

export interface NewsArticle {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'volume_spike' | 'news';
  value?: number;
  triggered: boolean;
  createdAt: string;
  active: boolean;
}

export interface Position {
  buyPrice: number;
  quantity: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  volume: number;
  currency?: string;
  position?: Position;
}

export interface UpcomingEarnings {
  symbol: string;
  name: string;
  date: string;
  epsEstimated: number | null;
  revenueEstimated: number | null;
  time: string; // 'bmo' | 'amc' | ''
}

export interface HistoricalPrice {
  date: string;
  close: number;
}

export interface AnalystRating {
  symbol: string;
  date: string;
  gradingCompany: string;
  newGrade: string;
  previousGrade: string;
}

export interface PriceTarget {
  symbol: string;
  publishedDate: string;
  newsTitle: string;
  analystName: string;
  priceTarget: number;
  adjPriceTarget: number;
  priceTargetPrevious: number;
  analystCompany: string;
}

export interface EarningsCall {
  symbol: string;
  date: string;
  epsEstimated: number;
  epsActual: number | null;
  revenueEstimated: number;
  revenueActual: number | null;
  time: string; // 'bmo' (before market open) or 'amc' (after market close)
}

export interface EconomicEvent {
  event: string;
  date: string;
  country: string;
  actual: number | null;
  previous: number | null;
  estimate: number | null;
  impact: 'Low' | 'Medium' | 'High' | 'None';
  currency: string;
  unit: string;
}

export interface GeneralNewsArticle {
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
  uuid: string;
  author: string;
}

export interface SectorPerformance {
  sector: string;
  changesPercentage: number;
  etfSymbol: string;
  price: number;
}

export interface InsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  typeOfOwner: string;
  acquistionOrDisposition: 'A' | 'D';
  transactionType: string;
  securitiesTransacted: number;
  price: number;
  securityName: string;
  link: string;
}

export interface CongressionalTrade {
  firstName: string;
  lastName: string;
  office: string;
  link: string;
  dateRecieved: string;
  transactionDate: string;
  owner: string;
  assetDescription: string;
  assetType: string;
  type: string;
  amount: string;
  symbol: string;
}

export interface AnalystConsensus {
  symbol: string;
  date: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface RatingChange {
  symbol: string;
  companyName: string;
  date: string;
  gradingCompany: string;
  previousGrade: string;
  newGrade: string;
  action: 'upgrade' | 'downgrade';
}

export interface MarketCommentary {
  personName: string;
  personTitle: string;
  opinion: string;
  subject: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  source: string;
  date: string;
}
