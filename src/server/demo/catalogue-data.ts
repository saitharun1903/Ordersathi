// Fictional demo catalogue. ALL PRICES ARE DEMO DATA — not real market prices.

export type DemoProduct = {
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  specs: Record<string, string>;
  sellingUnit: string;
  price: number; // rupees
  conversions?: Record<string, number>; // 1 <unit> = n selling units
  aliases?: { text: string; language: "EN" | "TE" | "TRANSLIT" }[];
};

const te = (text: string) => ({ text, language: "TE" as const });
const tr = (text: string) => ({ text, language: "TRANSLIT" as const });
const en = (text: string) => ({ text, language: "EN" as const });

export const DEMO_PRODUCTS: DemoProduct[] = [
  // Switches
  { sku: "ANC-RS-6A-1W", name: "Anchor Roma 6A 1-way switch", category: "Switch", brand: "Anchor", specs: { rating: "6A", type: "1-way", colour: "White" }, sellingUnit: "PIECE", price: 42, conversions: { BOX: 20 } },
  { sku: "ANC-RS-6A-2W", name: "Anchor Roma 6A 2-way switch", category: "Switch", brand: "Anchor", specs: { rating: "6A", type: "2-way", colour: "White" }, sellingUnit: "PIECE", price: 68, conversions: { BOX: 20 } },
  { sku: "ANC-RS-16A-1W", name: "Anchor Roma 16A 1-way switch", category: "Switch", brand: "Anchor", specs: { rating: "16A", type: "1-way", colour: "White" }, sellingUnit: "PIECE", price: 86, conversions: { BOX: 10 }, aliases: [en("ac switch"), en("geyser switch")] },
  { sku: "HAV-CR-6A-1W", name: "Havells Coral 6A 1-way switch", category: "Switch", brand: "Havells", specs: { rating: "6A", type: "1-way", colour: "White" }, sellingUnit: "PIECE", price: 39, conversions: { BOX: 20 } },
  { sku: "HAV-CR-16A-1W", name: "Havells Coral 16A 1-way switch", category: "Switch", brand: "Havells", specs: { rating: "16A", type: "1-way", colour: "White" }, sellingUnit: "PIECE", price: 82, conversions: { BOX: 10 } },
  { sku: "LEG-MY-6A-1W", name: "Legrand Myrius 6A 1-way switch", category: "Switch", brand: "Legrand", specs: { rating: "6A", type: "1-way", colour: "White" }, sellingUnit: "PIECE", price: 58, conversions: { BOX: 20 } },
  // Sockets
  { sku: "ANC-RS-6A-SKT", name: "Anchor Roma 6A 3-pin socket", category: "Socket", brand: "Anchor", specs: { rating: "6A", pins: "3 pin", colour: "White" }, sellingUnit: "PIECE", price: 64, conversions: { BOX: 10 } },
  { sku: "ANC-RS-16A-SKT", name: "Anchor Roma 16A 3-pin socket", category: "Socket", brand: "Anchor", specs: { rating: "16A", pins: "3 pin", colour: "White" }, sellingUnit: "PIECE", price: 112, conversions: { BOX: 10 }, aliases: [en("power socket"), tr("power point")] },
  { sku: "HAV-CR-6A-SKT", name: "Havells Coral 6A 3-pin socket", category: "Socket", brand: "Havells", specs: { rating: "6A", pins: "3 pin", colour: "White" }, sellingUnit: "PIECE", price: 61, conversions: { BOX: 10 } },
  { sku: "HAV-CR-16A-SKT", name: "Havells Coral 16A 3-pin socket", category: "Socket", brand: "Havells", specs: { rating: "16A", pins: "3 pin", colour: "White" }, sellingUnit: "PIECE", price: 108, conversions: { BOX: 10 } },
  // House wire (90 m rolls)
  { sku: "POL-FR-1.0-RD", name: "Polycab FR 1.0 sq mm wire, red, 90 m", category: "Wire", brand: "Polycab", specs: { size: "1.0 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 1190 },
  { sku: "POL-FR-1.5-RD", name: "Polycab FR 1.5 sq mm wire, red, 90 m", category: "Wire", brand: "Polycab", specs: { size: "1.5 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 1680 },
  { sku: "POL-FR-1.5-BK", name: "Polycab FR 1.5 sq mm wire, black, 90 m", category: "Wire", brand: "Polycab", specs: { size: "1.5 sq mm", colour: "Black", length: "90 m" }, sellingUnit: "ROLL", price: 1680 },
  { sku: "POL-FR-2.5-RD", name: "Polycab FR 2.5 sq mm wire, red, 90 m", category: "Wire", brand: "Polycab", specs: { size: "2.5 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 2690 },
  { sku: "POL-FR-2.5-BK", name: "Polycab FR 2.5 sq mm wire, black, 90 m", category: "Wire", brand: "Polycab", specs: { size: "2.5 sq mm", colour: "Black", length: "90 m" }, sellingUnit: "ROLL", price: 2690 },
  { sku: "POL-FR-4.0-RD", name: "Polycab FR 4.0 sq mm wire, red, 90 m", category: "Wire", brand: "Polycab", specs: { size: "4 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 4260 },
  { sku: "FIN-FR-1.5-RD", name: "Finolex FR 1.5 sq mm wire, red, 90 m", category: "Wire", brand: "Finolex", specs: { size: "1.5 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 1640 },
  { sku: "FIN-FR-2.5-RD", name: "Finolex FR 2.5 sq mm wire, red, 90 m", category: "Wire", brand: "Finolex", specs: { size: "2.5 sq mm", colour: "Red", length: "90 m" }, sellingUnit: "ROLL", price: 2640 },
  // Flexible cable sold per metre, 100 m coil conversion
  { sku: "POL-FLX-3C-1.5", name: "Polycab 3 core 1.5 sq mm flexible cable", category: "Flexible Cable", brand: "Polycab", specs: { cores: "3 core", size: "1.5 sq mm" }, sellingUnit: "METRE", price: 64, conversions: { COIL: 100 }, aliases: [tr("3 core wire"), en("flexible wire")] },
  { sku: "GI-EARTH-8SWG", name: "GI earthing wire 8 SWG", category: "Earthing Wire", brand: null, specs: { gauge: "8 SWG" }, sellingUnit: "KG", price: 96, aliases: [en("gi wire"), tr("earthing wire")] },
  // MCBs
  { sku: "HAV-MCB-6A-SP", name: "Havells 6A SP MCB (C-curve)", category: "MCB", brand: "Havells", specs: { rating: "6A", poles: "SP", curve: "C" }, sellingUnit: "PIECE", price: 198, conversions: { BOX: 12 } },
  { sku: "HAV-MCB-16A-SP", name: "Havells 16A SP MCB (C-curve)", category: "MCB", brand: "Havells", specs: { rating: "16A", poles: "SP", curve: "C" }, sellingUnit: "PIECE", price: 212, conversions: { BOX: 12 } },
  { sku: "HAV-MCB-32A-DP", name: "Havells 32A DP MCB (C-curve)", category: "MCB", brand: "Havells", specs: { rating: "32A", poles: "DP", curve: "C" }, sellingUnit: "PIECE", price: 640, conversions: { BOX: 6 } },
  { sku: "LEG-MCB-16A-SP", name: "Legrand 16A SP MCB (C-curve)", category: "MCB", brand: "Legrand", specs: { rating: "16A", poles: "SP", curve: "C" }, sellingUnit: "PIECE", price: 236, conversions: { BOX: 12 } },
  { sku: "HAV-DB-8W", name: "Havells 8-way SPN distribution board", category: "Distribution Board", brand: "Havells", specs: { ways: "8 way" }, sellingUnit: "PIECE", price: 1450, aliases: [en("db box"), en("db")] },
  // Lighting
  { sku: "PHI-LED-9W", name: "Philips 9W LED bulb B22", category: "LED Bulb", brand: "Philips", specs: { wattage: "9W", cap: "B22" }, sellingUnit: "PIECE", price: 95, conversions: { BOX: 10 } },
  { sku: "PHI-LED-12W", name: "Philips 12W LED bulb B22", category: "LED Bulb", brand: "Philips", specs: { wattage: "12W", cap: "B22" }, sellingUnit: "PIECE", price: 135, conversions: { BOX: 10 } },
  { sku: "SYS-LED-9W", name: "Syska 9W LED bulb B22", category: "LED Bulb", brand: "Syska", specs: { wattage: "9W", cap: "B22" }, sellingUnit: "PIECE", price: 79, conversions: { BOX: 10 } },
  { sku: "WIP-BAT-20W", name: "Wipro 20W LED batten, 4 ft", category: "LED Batten", brand: "Wipro", specs: { wattage: "20W", length: "4 ft" }, sellingUnit: "PIECE", price: 340, aliases: [en("tube light"), tr("tubelight")] },
  { sku: "ANC-HLD-B22", name: "Anchor B22 batten holder", category: "Bulb Holder", brand: "Anchor", specs: { cap: "B22" }, sellingUnit: "PIECE", price: 28, conversions: { BOX: 20 } },
  // Fans
  { sku: "CRM-FAN-1200-BR", name: "Crompton 1200 mm ceiling fan, brown", category: "Ceiling Fan", brand: "Crompton", specs: { sweep: "1200 mm", colour: "Brown" }, sellingUnit: "PIECE", price: 1890 },
  { sku: "HAV-FAN-1200-WH", name: "Havells 1200 mm ceiling fan, white", category: "Ceiling Fan", brand: "Havells", specs: { sweep: "1200 mm", colour: "White" }, sellingUnit: "PIECE", price: 2240 },
  { sku: "ANC-RS-REG", name: "Anchor Roma fan regulator, 2 module", category: "Fan Regulator", brand: "Anchor", specs: { modules: "2 module" }, sellingUnit: "PIECE", price: 265 },
  // Accessories
  { sku: "ANC-RS-PL-6M", name: "Anchor Roma 6 module plate, white", category: "Switch Plate", brand: "Anchor", specs: { modules: "6 module", colour: "White" }, sellingUnit: "PIECE", price: 92 },
  { sku: "ANC-RS-PL-8M", name: "Anchor Roma 8 module plate, white", category: "Switch Plate", brand: "Anchor", specs: { modules: "8 module", colour: "White" }, sellingUnit: "PIECE", price: 118 },
  { sku: "GEN-BOX-6M", name: "Concealed metal box, 6 module", category: "Concealed Box", brand: null, specs: { modules: "6 module" }, sellingUnit: "PIECE", price: 54, aliases: [en("gang box"), en("modular box")] },
  { sku: "GEN-PVC-20", name: "PVC conduit pipe 20 mm, 3 m length", category: "Conduit Pipe", brand: null, specs: { diameter: "20 mm", length: "3 m" }, sellingUnit: "PIECE", price: 38, aliases: [tr("pvc pipe")] },
  { sku: "GEN-PVC-25", name: "PVC conduit pipe 25 mm, 3 m length", category: "Conduit Pipe", brand: null, specs: { diameter: "25 mm", length: "3 m" }, sellingUnit: "PIECE", price: 52 },
  { sku: "STG-TAPE-BK", name: "Steelgrip insulation tape, black (pack of 10)", category: "Insulation Tape", brand: "Steelgrip", specs: { colour: "Black" }, sellingUnit: "PACKET", price: 120, conversions: { PIECE: 0.1 }, aliases: [tr("tape"), en("black tape"), te("టేప్")] },
  { sku: "GEN-TIE-200", name: "Nylon cable ties 200 mm (pack of 100)", category: "Cable Tie", brand: null, specs: { length: "200 mm" }, sellingUnit: "PACKET", price: 85 },
  { sku: "ANC-PLG-6A", name: "Anchor 6A 2-pin plug top", category: "Plug Top", brand: "Anchor", specs: { rating: "6A", pins: "2 pin" }, sellingUnit: "PIECE", price: 24, conversions: { BOX: 50 } },
  { sku: "ANC-EXT-4S", name: "Anchor 4-socket extension board with switch", category: "Extension Board", brand: "Anchor", specs: { sockets: "4 socket" }, sellingUnit: "PIECE", price: 385, aliases: [en("spike guard"), en("extension box")] },
];

export const DEMO_CUSTOMERS = [
  { key: "sai", name: "Sai Electricals", contactName: "Ravi Kumar", phone: "+91 98480 11223", city: "Kukatpally, Hyderabad", preferredLanguage: "TE" as const, notes: "Pays weekly. Prefers Anchor." },
  { key: "venkat", name: "Venkateswara Electricals & Hardware", contactName: "Srinivas Rao", phone: "+91 99490 44551", city: "Ameerpet, Hyderabad", preferredLanguage: "TE" as const },
  { key: "bright", name: "Bright Light Traders", contactName: "Imran Khan", phone: "+91 90000 33445", city: "Secunderabad", preferredLanguage: "EN" as const },
  { key: "lakshmi", name: "Lakshmi Ganapathi Agencies", contactName: "K. Lakshmi", phone: "+91 94400 77889", city: "Warangal", preferredLanguage: "TE" as const },
  { key: "metro", name: "Metro Builders (site store)", contactName: "Anil Reddy", phone: "+91 97010 55667", city: "Gachibowli, Hyderabad", preferredLanguage: "EN" as const, notes: "Contractor account. Special pricing on wires." },
  { key: "sri", name: "Sri Durga Electricals", contactName: "Durga Prasad", phone: "+91 93910 22334", city: "Vijayawada", preferredLanguage: "TE" as const },
  { key: "green", name: "Green Home Solutions", contactName: "Priya Nair", phone: "+91 98660 99001", city: "Madhapur, Hyderabad", preferredLanguage: "EN" as const },
  { key: "raju", name: "Raju Electrical Works", contactName: "P. Raju", phone: "+91 96520 66778", city: "Nizamabad", preferredLanguage: "AUTO" as const },
];

// Customer-specific prices (rupees). DEMO DATA.
export const DEMO_CUSTOMER_PRICES: { customer: string; sku: string; price: number }[] = [
  { customer: "metro", sku: "POL-FR-1.5-RD", price: 1595 },
  { customer: "metro", sku: "POL-FR-2.5-RD", price: 2560 },
  { customer: "metro", sku: "POL-FR-2.5-BK", price: 2560 },
  { customer: "metro", sku: "HAV-MCB-16A-SP", price: 199 },
  { customer: "sai", sku: "ANC-RS-6A-1W", price: 40 },
  { customer: "sai", sku: "ANC-RS-6A-SKT", price: 61 },
  { customer: "bright", sku: "PHI-LED-9W", price: 89 },
];

// Customer-specific wording.
export const DEMO_CUSTOMER_ALIASES: { customer: string; sku: string; text: string; language: "EN" | "TE" | "TRANSLIT" }[] = [
  { customer: "sai", sku: "ANC-RS-6A-1W", text: "maamulu switch", language: "TRANSLIT" },
  { customer: "sai", sku: "ANC-RS-6A-1W", text: "మామూలు స్విచ్", language: "TE" },
  { customer: "metro", sku: "POL-FR-2.5-RD", text: "site wire", language: "EN" },
];
