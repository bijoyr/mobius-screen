import type { Market, MarketId, Stock } from "@/types";
import { listIntlUniverse } from "./db";
import { SPX_UNIVERSE } from "./sp500";

/**
 * NSE F&O eligible stocks. Source: NSE's "Securities Available for Trading"
 * F&O list. The list changes ~quarterly; refresh from
 * https://www.nseindia.com/products-services/equity-derivatives-list-underlyings
 */
const IN_UNIVERSE: Stock[] = [
  ns("ABB", "ABB India", "Capital Goods"),
  ns("ABCAPITAL", "Aditya Birla Capital", "Financials"),
  ns("ABFRL", "Aditya Birla Fashion & Retail", "Consumer"),
  ns("ACC", "ACC", "Cement"),
  ns("ADANIENT", "Adani Enterprises", "Diversified"),
  ns("ADANIPORTS", "Adani Ports & SEZ", "Infrastructure"),
  ns("ALKEM", "Alkem Laboratories", "Pharma"),
  ns("AMBUJACEM", "Ambuja Cements", "Cement"),
  ns("APOLLOHOSP", "Apollo Hospitals", "Healthcare"),
  ns("APOLLOTYRE", "Apollo Tyres", "Auto Ancillaries"),
  ns("ASHOKLEY", "Ashok Leyland", "Auto"),
  ns("ASIANPAINT", "Asian Paints", "Paints"),
  ns("ASTRAL", "Astral", "Plastics"),
  ns("ATUL", "Atul", "Chemicals"),
  ns("AUBANK", "AU Small Finance Bank", "Banks"),
  ns("AUROPHARMA", "Aurobindo Pharma", "Pharma"),
  ns("AXISBANK", "Axis Bank", "Banks"),
  ns("BAJAJ-AUTO", "Bajaj Auto", "Auto"),
  ns("BAJAJFINSV", "Bajaj Finserv", "Financials"),
  ns("BAJFINANCE", "Bajaj Finance", "Financials"),
  ns("BALKRISIND", "Balkrishna Industries", "Auto Ancillaries"),
  ns("BANDHANBNK", "Bandhan Bank", "Banks"),
  ns("BANKBARODA", "Bank of Baroda", "Banks"),
  ns("BATAINDIA", "Bata India", "Consumer"),
  ns("BEL", "Bharat Electronics", "Defence"),
  ns("BERGEPAINT", "Berger Paints India", "Paints"),
  ns("BHARATFORG", "Bharat Forge", "Auto Ancillaries"),
  ns("BHARTIARTL", "Bharti Airtel", "Telecom"),
  ns("BHEL", "Bharat Heavy Electricals", "Capital Goods"),
  ns("BIOCON", "Biocon", "Pharma"),
  ns("BOSCHLTD", "Bosch", "Auto Ancillaries"),
  ns("BPCL", "Bharat Petroleum", "Oil & Gas"),
  ns("BRITANNIA", "Britannia Industries", "FMCG"),
  ns("BSOFT", "Birlasoft", "IT"),
  ns("CANBK", "Canara Bank", "Banks"),
  ns("CANFINHOME", "Can Fin Homes", "Financials"),
  ns("CHAMBLFERT", "Chambal Fertilizers", "Fertilizers"),
  ns("CHOLAFIN", "Cholamandalam Investment", "Financials"),
  ns("CIPLA", "Cipla", "Pharma"),
  ns("COALINDIA", "Coal India", "Mining"),
  ns("COFORGE", "Coforge", "IT"),
  ns("COLPAL", "Colgate Palmolive", "FMCG"),
  ns("CONCOR", "Container Corporation", "Logistics"),
  ns("COROMANDEL", "Coromandel International", "Fertilizers"),
  ns("CROMPTON", "Crompton Greaves", "Consumer Durables"),
  ns("CUB", "City Union Bank", "Banks"),
  ns("CUMMINSIND", "Cummins India", "Capital Goods"),
  ns("DABUR", "Dabur India", "FMCG"),
  ns("DALBHARAT", "Dalmia Bharat", "Cement"),
  ns("DEEPAKNTR", "Deepak Nitrite", "Chemicals"),
  ns("DIVISLAB", "Divi's Laboratories", "Pharma"),
  ns("DIXON", "Dixon Technologies", "Consumer Durables"),
  ns("DLF", "DLF", "Real Estate"),
  ns("DRREDDY", "Dr Reddy's Laboratories", "Pharma"),
  ns("EICHERMOT", "Eicher Motors", "Auto"),
  ns("ESCORTS", "Escorts Kubota", "Auto"),
  ns("EXIDEIND", "Exide Industries", "Auto Ancillaries"),
  ns("FEDERALBNK", "Federal Bank", "Banks"),
  ns("GAIL", "GAIL India", "Oil & Gas"),
  ns("GLENMARK", "Glenmark Pharmaceuticals", "Pharma"),
  ns("GMRINFRA", "GMR Airports Infrastructure", "Infrastructure"),
  ns("GNFC", "Gujarat Narmada Valley Fert", "Fertilizers"),
  ns("GODREJCP", "Godrej Consumer Products", "FMCG"),
  ns("GODREJPROP", "Godrej Properties", "Real Estate"),
  ns("GRANULES", "Granules India", "Pharma"),
  ns("GRASIM", "Grasim Industries", "Diversified"),
  ns("GUJGASLTD", "Gujarat Gas", "Oil & Gas"),
  ns("HAL", "Hindustan Aeronautics", "Defence"),
  ns("HAVELLS", "Havells India", "Consumer Durables"),
  ns("HCLTECH", "HCL Technologies", "IT"),
  ns("HDFCAMC", "HDFC Asset Management", "Financials"),
  ns("HDFCBANK", "HDFC Bank", "Banks"),
  ns("HDFCLIFE", "HDFC Life Insurance", "Insurance"),
  ns("HEROMOTOCO", "Hero MotoCorp", "Auto"),
  ns("HINDALCO", "Hindalco Industries", "Metals"),
  ns("HINDCOPPER", "Hindustan Copper", "Metals"),
  ns("HINDPETRO", "Hindustan Petroleum", "Oil & Gas"),
  ns("HINDUNILVR", "Hindustan Unilever", "FMCG"),
  ns("ICICIBANK", "ICICI Bank", "Banks"),
  ns("ICICIGI", "ICICI Lombard General Ins", "Insurance"),
  ns("ICICIPRULI", "ICICI Prudential Life Ins", "Insurance"),
  ns("IDEA", "Vodafone Idea", "Telecom"),
  ns("IDFCFIRSTB", "IDFC First Bank", "Banks"),
  ns("IEX", "Indian Energy Exchange", "Power"),
  ns("IGL", "Indraprastha Gas", "Oil & Gas"),
  ns("INDHOTEL", "Indian Hotels", "Consumer"),
  ns("INDIAMART", "IndiaMART InterMESH", "IT"),
  ns("INDIGO", "InterGlobe Aviation", "Aviation"),
  ns("INDUSINDBK", "IndusInd Bank", "Banks"),
  ns("INDUSTOWER", "Indus Towers", "Telecom"),
  ns("INFY", "Infosys", "IT"),
  ns("IOC", "Indian Oil Corporation", "Oil & Gas"),
  ns("IPCALAB", "IPCA Laboratories", "Pharma"),
  ns("IRCTC", "Indian Railway Catering", "Services"),
  ns("ITC", "ITC", "FMCG"),
  ns("JINDALSTEL", "Jindal Steel & Power", "Metals"),
  ns("JKCEMENT", "JK Cement", "Cement"),
  ns("JSWSTEEL", "JSW Steel", "Metals"),
  ns("JUBLFOOD", "Jubilant FoodWorks", "Consumer"),
  ns("KOTAKBANK", "Kotak Mahindra Bank", "Banks"),
  ns("LALPATHLAB", "Dr Lal PathLabs", "Healthcare"),
  ns("LAURUSLABS", "Laurus Labs", "Pharma"),
  ns("LICHSGFIN", "LIC Housing Finance", "Financials"),
  ns("LT", "Larsen & Toubro", "Capital Goods"),
  ns("LTIM", "LTIMindtree", "IT"),
  ns("LTTS", "L&T Technology Services", "IT"),
  ns("LUPIN", "Lupin", "Pharma"),
  ns("M&M", "Mahindra & Mahindra", "Auto"),
  ns("M&MFIN", "M&M Financial Services", "Financials"),
  ns("MANAPPURAM", "Manappuram Finance", "Financials"),
  ns("MARICO", "Marico", "FMCG"),
  ns("MARUTI", "Maruti Suzuki India", "Auto"),
  ns("MCX", "Multi Commodity Exchange", "Financials"),
  ns("METROPOLIS", "Metropolis Healthcare", "Healthcare"),
  ns("MFSL", "Max Financial Services", "Insurance"),
  ns("MGL", "Mahanagar Gas", "Oil & Gas"),
  ns("MOTHERSON", "Samvardhana Motherson Intl", "Auto Ancillaries"),
  ns("MPHASIS", "Mphasis", "IT"),
  ns("MRF", "MRF", "Auto Ancillaries"),
  ns("MUTHOOTFIN", "Muthoot Finance", "Financials"),
  ns("NATIONALUM", "National Aluminium", "Metals"),
  ns("NAUKRI", "Info Edge", "IT"),
  ns("NAVINFLUOR", "Navin Fluorine International", "Chemicals"),
  ns("NESTLEIND", "Nestle India", "FMCG"),
  ns("NMDC", "NMDC", "Mining"),
  ns("NTPC", "NTPC", "Power"),
  ns("OBEROIRLTY", "Oberoi Realty", "Real Estate"),
  ns("OFSS", "Oracle Financial Services", "IT"),
  ns("ONGC", "Oil & Natural Gas Corp", "Oil & Gas"),
  ns("PAGEIND", "Page Industries", "Consumer"),
  ns("PEL", "Piramal Enterprises", "Financials"),
  ns("PERSISTENT", "Persistent Systems", "IT"),
  ns("PETRONET", "Petronet LNG", "Oil & Gas"),
  ns("PFC", "Power Finance Corporation", "Financials"),
  ns("PIDILITIND", "Pidilite Industries", "Chemicals"),
  ns("PIIND", "PI Industries", "Chemicals"),
  ns("PNB", "Punjab National Bank", "Banks"),
  ns("POLYCAB", "Polycab India", "Capital Goods"),
  ns("POWERGRID", "Power Grid Corporation", "Power"),
  ns("PVRINOX", "PVR Inox", "Media"),
  ns("RAMCOCEM", "The Ramco Cements", "Cement"),
  ns("RBLBANK", "RBL Bank", "Banks"),
  ns("RECLTD", "REC", "Financials"),
  ns("RELIANCE", "Reliance Industries", "Diversified"),
  ns("SAIL", "Steel Authority of India", "Metals"),
  ns("SBICARD", "SBI Cards & Payment", "Financials"),
  ns("SBILIFE", "SBI Life Insurance", "Insurance"),
  ns("SBIN", "State Bank of India", "Banks"),
  ns("SHREECEM", "Shree Cement", "Cement"),
  ns("SHRIRAMFIN", "Shriram Finance", "Financials"),
  ns("SIEMENS", "Siemens", "Capital Goods"),
  ns("SRF", "SRF", "Chemicals"),
  ns("SUNPHARMA", "Sun Pharmaceutical Industries", "Pharma"),
  ns("SUNTV", "Sun TV Network", "Media"),
  ns("SYNGENE", "Syngene International", "Pharma"),
  ns("TATACHEM", "Tata Chemicals", "Chemicals"),
  ns("TATACOMM", "Tata Communications", "Telecom"),
  ns("TATACONSUM", "Tata Consumer Products", "FMCG"),
  ns("TATAMOTORS", "Tata Motors", "Auto"),
  ns("TATAPOWER", "Tata Power", "Power"),
  ns("TATASTEEL", "Tata Steel", "Metals"),
  ns("TCS", "Tata Consultancy Services", "IT"),
  ns("TECHM", "Tech Mahindra", "IT"),
  ns("TITAN", "Titan Company", "Consumer"),
  ns("TORNTPHARM", "Torrent Pharmaceuticals", "Pharma"),
  ns("TORNTPOWER", "Torrent Power", "Power"),
  ns("TRENT", "Trent", "Consumer"),
  ns("TVSMOTOR", "TVS Motor Company", "Auto"),
  ns("UBL", "United Breweries", "Consumer"),
  ns("ULTRACEMCO", "UltraTech Cement", "Cement"),
  ns("UPL", "UPL", "Chemicals"),
  ns("VEDL", "Vedanta", "Metals"),
  ns("VOLTAS", "Voltas", "Consumer Durables"),
  ns("WIPRO", "Wipro", "IT"),
  ns("ZEEL", "Zee Entertainment Enterprises", "Media"),
  ns("ZYDUSLIFE", "Zydus Lifesciences", "Pharma"),
];

const INTL_META: Omit<Market, "universe"> = {
  id: "INTL",
  label: "International · Watchlist",
  direction: "LONG_ONLY",
  currencySymbol: "$",
  timezone: "UTC",
  themePrompt: `International equities — this is the user's hand-picked watchlist drawn from multiple global exchanges (US, Europe, Asia). It is NOT a curated index, so treat each name on its own merits.

Relevant global macro themes:
- US Fed rate path, dollar (DXY) strength, US 10y yield direction
- Sector rotation: AI/semis (NVDA, AVGO, ASML, TSM ecosystem), mega-cap tech earnings, financials vs. defensives
- China stimulus / property-sector tape, Japan reflation + JPY policy, Europe energy/industrial cycle
- Geopolitics: US-China tech/tariff posture, Middle East oil supply, Russia/Ukraine
- Earnings cadence: US quarterly cycle (Jan/Apr/Jul/Oct), Europe semi-annual+, Asia mixed`,
};

const MARKETS_STATIC: Record<"IN" | "US", Market> = {
  IN: {
    id: "IN",
    label: "India · NSE F&O",
    direction: "LONG_SHORT",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    universe: IN_UNIVERSE,
    themePrompt: `Indian equities — relevant macro themes:
- RBI rate cycle, INR/USD, FII/DII flows, government capex pace
- Sector cycles: PSU banks, defence, capital goods, autos (rural/urban demand), pharma exports, IT (US client spending)
- Earnings season cadence (~quarterly), upcoming budget / monetary policy events`,
  },
  US: {
    id: "US",
    label: "US · S&P 500",
    direction: "LONG_SHORT",
    currencySymbol: "$",
    timezone: "America/New_York",
    universe: SPX_UNIVERSE,
    themePrompt: `US equities — S&P 500 large caps. Relevant macro themes:
- Fed rate path, US 10y yield, DXY, liquidity; CPI / jobs / PCE prints
- Sector rotation: AI & semis capex (NVDA/AVGO/AMD/MSFT ecosystem), mega-cap tech earnings, financials vs. defensives, energy, healthcare, industrials
- Earnings season cadence (Jan/Apr/Jul/Oct) — guidance & margins drive moves
- Style factors: growth vs. value, market breadth, mega-cap concentration risk
- Geopolitics & policy: US-China tech/tariffs, oil supply, election/fiscal cycle`,
  },
};

export const MARKETS: Record<"IN" | "US", Market> = MARKETS_STATIC;

export async function getMarket(id: MarketId): Promise<Market> {
  if (id === "INTL") {
    return { ...INTL_META, universe: await listIntlUniverse() };
  }
  return MARKETS_STATIC[id];
}

export async function listMarkets(): Promise<Market[]> {
  return [MARKETS_STATIC.IN, MARKETS_STATIC.US, await getMarket("INTL")];
}

export async function findStock(
  bareSymbol: string,
): Promise<{ market: Market; stock: Stock } | null> {
  const upper = bareSymbol.toUpperCase();
  for (const market of await listMarkets()) {
    const stock = market.universe.find((s) => s.symbol === upper);
    if (stock) return { market, stock };
  }
  return null;
}

// ----- Stock factory helpers -----

function ns(symbol: string, name: string, sector: string): Stock {
  return {
    symbol,
    yahooSymbol: `${symbol}.NS`,
    tvSymbol: `NSE:${symbol}`,
    exchange: "NSE",
    marketId: "IN",
    name,
    sector,
  };
}

