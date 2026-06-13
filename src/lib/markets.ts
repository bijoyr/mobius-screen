import type { Market, MarketId, Stock } from "@/types";
import { listIntlUniverse } from "./db";

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

/**
 * UAE — DFM (Dubai) + ADX (Abu Dhabi).
 *
 * Two data paths feed this universe:
 *  - DFM (`.AE` suffix) → Yahoo Finance via `lib/yahoo.ts`.
 *  - ADX → TradingView's public scanner endpoint via `lib/tvscan.ts`.
 *    Yahoo has no ADX coverage; the scanner returns price + RSI/MACD/SMA
 *    pre-computed (no OHLC bars, so Fib levels are unavailable for ADX).
 *
 * TradingView prefixes: `DFM:` for Dubai, `ADX:` for Abu Dhabi.
 * All stocks below were verified live via probe scripts.
 */
const UAE_UNIVERSE: Stock[] = [
  // ===== DFM (Dubai) =====
  // Real Estate
  dfm("EMAAR", "Emaar Properties", "Real Estate"),
  dfm("EMAARDEV", "Emaar Development", "Real Estate"),
  dfm("DEYAAR", "Deyaar Development", "Real Estate"),
  dfm("UNION", "Union Properties", "Real Estate"),
  // Diversified / Investment
  dfm("DIC", "Dubai Investments", "Diversified"),
  dfm("TECOM", "TECOM Group", "Real Estate / Tech Zones"),
  // Banks
  dfm("DIB", "Dubai Islamic Bank", "Banks"),
  dfm("CBD", "Commercial Bank of Dubai", "Banks"),
  dfm("MASQ", "Mashreqbank", "Banks"),
  dfm("AJMANBANK", "Ajman Bank", "Banks"),
  // Financials
  dfm("DFM", "Dubai Financial Market", "Exchange"),
  dfm("GFH", "GFH Financial Group", "Financials"),
  dfm("SHUAA", "SHUAA Capital", "Financials"),
  dfm("AMLAK", "Amlak Finance", "Financials"),
  // Utilities
  dfm("DEWA", "Dubai Electricity & Water Authority", "Utilities"),
  dfm("EMPOWER", "Emirates Central Cooling (Empower)", "Utilities"),
  dfm("TABREED", "National Central Cooling", "Utilities"),
  // Infrastructure / Tolls / Parking
  dfm("SALIK", "Salik Company", "Infrastructure"),
  dfm("PARKIN", "Parkin Company", "Infrastructure"),
  // Aviation / Logistics
  dfm("AIRARABIA", "Air Arabia", "Aviation"),
  dfm("ARMX", "Aramex", "Logistics"),
  dfm("GULFNAV", "Gulf Navigation Holding", "Logistics"),
  dfm("DTC", "Dubai Taxi Company", "Transport"),
  // FMCG / Consumer
  dfm("UNIKAI", "Unikai Foods", "FMCG"),
  // Insurance
  dfm("ALLIANCE", "Alliance Insurance", "Insurance"),
  // Construction
  dfm("DSI", "Drake and Scull International", "Construction"),

  // ===== ADX (Abu Dhabi) =====
  // Banks
  adx("FAB", "First Abu Dhabi Bank", "Banks"),
  adx("ADCB", "Abu Dhabi Commercial Bank", "Banks"),
  adx("ADIB", "Abu Dhabi Islamic Bank", "Banks"),
  adx("CBI", "Commercial Bank International", "Banks"),
  adx("RAKBANK", "National Bank of Ras Al Khaimah", "Banks"),
  // Holding / Diversified
  adx("IHC", "International Holding Company", "Diversified"),
  adx("ALPHADHABI", "Alpha Dhabi Holding", "Diversified"),
  // Real Estate
  adx("ALDAR", "Aldar Properties", "Real Estate"),
  adx("ESHRAQ", "Eshraq Investments", "Real Estate"),
  adx("RAKPROP", "RAK Properties", "Real Estate"),
  // Energy / ADNOC group
  adx("ADNOCDIST", "ADNOC Distribution", "Oil & Gas"),
  adx("ADNOCGAS", "ADNOC Gas", "Oil & Gas"),
  adx("ADNOCDRILL", "ADNOC Drilling", "Oil & Gas"),
  adx("ADNOCLS", "ADNOC Logistics & Services", "Logistics"),
  adx("TAQA", "Abu Dhabi National Energy (TAQA)", "Utilities / Energy"),
  adx("BOROUGE", "Borouge", "Petrochemicals"),
  adx("DANA", "Dana Gas", "Oil & Gas"),
  // Telecom
  adx("EAND", "e& (Emirates Telecom Group)", "Telecom"),
  // Consumer / Healthcare
  adx("AGTHIA", "Agthia Group", "FMCG"),
  adx("PUREHEALTH", "PureHealth Holding", "Healthcare"),
  adx("ADNH", "Abu Dhabi National Hotels", "Hotels"),
  // Aviation
  adx("ADAVIATION", "Abu Dhabi National Aviation", "Aviation"),
  // Industrials / Materials
  adx("EMSTEEL", "Emirates Steel Arkan", "Metals"),
  adx("NMDC", "NMDC Group", "Construction"),
  adx("WAHA", "Waha Capital", "Financials"),
  // Insurance
  adx("ADNIC", "Abu Dhabi National Insurance", "Insurance"),
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

const MARKETS_STATIC: Record<"IN" | "UAE", Market> = {
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
  UAE: {
    id: "UAE",
    label: "UAE · DFM + ADX",
    direction: "LONG_ONLY",
    currencySymbol: "AED ",
    timezone: "Asia/Dubai",
    universe: UAE_UNIVERSE,
    themePrompt: `UAE equities — both DFM-listed (Dubai) and ADX-listed (Abu Dhabi) names. Relevant macro themes:
- Dubai real-estate cycle (DFM): off-plan launch volumes, rental yields, occupancy, payment plans
- Abu Dhabi capital cycle (ADX): IHC ecosystem, sovereign-aligned ADNOC group spin-offs (ADNOCDIST/GAS/DRILL/LS), AI/data-center theme via G42-linked names
- Tourism: hotels (Jumeirah, ADNH), aviation (Air Arabia, ADAVIATION), retail demand
- AED/USD peg is fixed — no FX volatility, but US Fed liquidity still drives flows into UAE equities
- Banking: NIMs sensitive to US Fed; DIB/Mashreq/CBD on DFM, FAB/ADCB/ADIB on ADX
- Infrastructure & utility privatisations (DEWA, Salik, Parkin, Empower, TAQA) — yield-oriented names
- Energy: ADNOC IPO complex on ADX (gas, drilling, logistics, distribution), Borouge for petrochems
- Telecom: e& (EAND on ADX) is the dominant operator regionally
- Earnings cadence ~quarterly; Dubai 2040 plan, Abu Dhabi Vision 2030, ADQ/Mubadala-driven capex, regional geopolitics`,
  },
};

export const MARKETS: Record<"IN" | "UAE", Market> = MARKETS_STATIC;

export async function getMarket(id: MarketId): Promise<Market> {
  if (id === "INTL") {
    return { ...INTL_META, universe: await listIntlUniverse() };
  }
  return MARKETS_STATIC[id];
}

export async function listMarkets(): Promise<Market[]> {
  return [MARKETS_STATIC.IN, MARKETS_STATIC.UAE, await getMarket("INTL")];
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

function dfm(symbol: string, name: string, sector: string): Stock {
  return {
    symbol,
    yahooSymbol: `${symbol}.AE`,
    tvSymbol: `DFM:${symbol}`,
    exchange: "DFM",
    marketId: "UAE",
    name,
    sector,
  };
}

function adx(symbol: string, name: string, sector: string): Stock {
  return {
    symbol,
    yahooSymbol: "",
    tvSymbol: `ADX:${symbol}`,
    exchange: "ADX",
    marketId: "UAE",
    name,
    sector,
  };
}
