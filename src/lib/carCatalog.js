// The list of car makes and models people pick from when adding a car or a spot.
// Online, the full list lives in the database (car_makes / car_models), filled from the
// US government's free vehicle database (NHTSA vPIC) plus the cars below.
// This built-in list is used when the app runs without the backend, and it adds
// Gulf, Japanese-market and classic models that the US list doesn't have.
// Order of makes = roughly how popular they are with car people in the Gulf.
export const BUILTIN_CARS = {
  Toyota: ["Land Cruiser", "Land Cruiser Prado", "Supra", "GR Supra", "GR86", "86", "Camry", "Corolla", "GR Corolla", "GR Yaris", "Yaris", "Hilux", "Fortuner", "FJ Cruiser", "Sequoia", "Tundra", "Tacoma", "4Runner", "RAV4", "Highlander", "Avalon", "Celica", "MR2", "Chaser", "Mark II", "Crown", "AE86"],
  Nissan: ["Patrol", "Patrol Nismo", "Skyline GT-R", "GT-R", "Silvia", "180SX", "Z", "370Z", "350Z", "300ZX", "240SX", "Sunny", "Altima", "Maxima", "Sentra", "Kicks", "X-Trail", "Pathfinder", "Armada", "Navara", "Safari"],
  Lexus: ["LX", "LX 570", "LX 600", "GX", "RX", "ES", "IS", "IS F", "GS", "LS", "LC", "LC 500", "RC", "RC F", "LFA", "NX", "UX"],
  BMW: ["M2", "M3", "M4", "M5", "M8", "X5 M", "X6 M", "XM", "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "X1", "X3", "X5", "X6", "X7", "Z4", "i4", "iX", "i8", "E30 M3", "E46 M3"],
  "Mercedes-Benz": ["G-Class", "G 63 AMG", "AMG GT", "C-Class", "C 63 AMG", "E-Class", "E 63 AMG", "S-Class", "CLA", "CLS", "GLA", "GLC", "GLE", "GLS", "SL", "SLS AMG", "Maybach S-Class", "EQS"],
  Porsche: ["911", "911 GT3", "911 GT3 RS", "911 Turbo S", "718 Cayman", "718 Boxster", "Cayman GT4", "Cayenne", "Macan", "Panamera", "Taycan", "Carrera GT", "918 Spyder"],
  Ferrari: ["F40", "F50", "Enzo", "LaFerrari", "SF90 Stradale", "296 GTB", "F8 Tributo", "488 GTB", "458 Italia", "812 Superfast", "Roma", "Portofino", "Purosangue", "12Cilindri", "California"],
  Lamborghini: ["Urus", "Huracan", "Aventador", "Revuelto", "Gallardo", "Murcielago", "Countach", "Diablo"],
  Honda: ["Civic", "Civic Type R", "S2000", "NSX", "Integra", "Integra Type R", "Accord", "Prelude", "CR-V", "Pilot", "HR-V", "City"],
  Mazda: ["MX-5", "RX-7", "RX-8", "Mazda3", "Mazda6", "CX-5", "CX-9", "CX-90", "CX-30"],
  Mitsubishi: ["Lancer Evolution", "Lancer", "Pajero", "Montero", "Outlander", "ASX", "Eclipse", "3000GT", "L200"],
  Subaru: ["WRX", "WRX STI", "Impreza", "BRZ", "Forester", "Outback", "XV"],
  Chevrolet: ["Corvette", "Camaro", "Camaro ZL1", "Tahoe", "Suburban", "Silverado", "Caprice", "Impala", "Malibu", "Lumina", "Captiva", "Blazer", "Traverse"],
  Ford: ["Mustang", "Mustang GT", "Shelby GT500", "F-150", "F-150 Raptor", "Ranger", "Ranger Raptor", "Bronco", "Explorer", "Expedition", "Edge", "Taurus", "GT"],
  Dodge: ["Challenger", "Challenger SRT Hellcat", "Charger", "Charger SRT Hellcat", "Durango", "Viper", "Ram"],
  Ram: ["1500", "1500 TRX", "2500"],
  Jeep: ["Wrangler", "Grand Cherokee", "Grand Cherokee Trackhawk", "Cherokee", "Gladiator", "Compass"],
  GMC: ["Yukon", "Yukon Denali", "Sierra", "Sierra Denali", "Hummer EV", "Acadia"],
  Cadillac: ["Escalade", "CT5-V Blackwing", "CT4-V Blackwing", "CTS-V", "XT6"],
  Audi: ["R8", "RS3", "RS4", "RS5", "RS6", "RS7", "RS Q8", "S3", "S4", "A3", "A4", "A6", "A8", "Q5", "Q7", "Q8", "TT", "e-tron GT"],
  Volkswagen: ["Golf", "Golf GTI", "Golf R", "Jetta", "Passat", "Tiguan", "Touareg", "Teramont", "Beetle"],
  "Land Rover": ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Defender", "Discovery"],
  "Rolls-Royce": ["Cullinan", "Ghost", "Phantom", "Wraith", "Dawn", "Spectre"],
  Bentley: ["Bentayga", "Continental GT", "Flying Spur", "Mulsanne"],
  "Aston Martin": ["DB11", "DB12", "DBS", "DBX", "Vantage", "Valkyrie"],
  McLaren: ["720S", "750S", "765LT", "570S", "600LT", "Artura", "GT", "P1", "Senna", "F1"],
  Bugatti: ["Chiron", "Veyron", "Divo", "Tourbillon"],
  Maserati: ["MC20", "Ghibli", "Levante", "Quattroporte", "GranTurismo", "Grecale"],
  "Alfa Romeo": ["Giulia", "Giulia Quadrifoglio", "Stelvio", "4C"],
  Tesla: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Roadster"],
  Hyundai: ["Elantra", "Elantra N", "Sonata", "Accent", "Tucson", "Santa Fe", "Palisade", "Creta", "Veloster N", "i30 N", "Ioniq 5", "Ioniq 5 N", "Genesis Coupe"],
  Kia: ["Stinger", "K5", "Cerato", "Pegas", "Sportage", "Sorento", "Telluride", "Carnival", "Seltos", "EV6", "EV9"],
  Genesis: ["G70", "G80", "G90", "GV70", "GV80"],
  Infiniti: ["Q50", "Q60", "QX50", "QX60", "QX80", "G35", "G37", "FX35"],
  Acura: ["NSX", "Integra", "TLX", "RSX", "MDX"],
  Suzuki: ["Jimny", "Swift", "Swift Sport", "Vitara", "Dzire", "Ertiga"],
  Peugeot: ["208", "308", "508", "2008", "3008", "5008"],
  Renault: ["Megane RS", "Clio", "Duster", "Koleos", "Symbol"],
  Skoda: ["Octavia", "Octavia RS", "Superb", "Kodiaq", "Karoq"],
  Opel: ["Astra", "Corsa", "Insignia", "Grandland"],
  Isuzu: ["D-Max", "MU-X"],
  Volvo: ["XC40", "XC60", "XC90", "S60", "S90", "V60", "240"],
  Mini: ["Cooper", "Cooper S", "John Cooper Works", "Countryman"],
  Lotus: ["Emira", "Evora", "Exige", "Elise", "Eletre"],
  Alpine: ["A110"],
  Koenigsegg: ["Jesko", "Regera", "Agera", "Gemera"],
  Pagani: ["Huayra", "Zonda", "Utopia"],
  Lincoln: ["Navigator", "Aviator", "Continental"],
  Chrysler: ["300", "300C", "Pacifica"],
  Changan: ["CS35 Plus", "CS75 Plus", "CS85", "CS95", "UNI-K", "UNI-T", "UNI-V", "Eado", "Alsvin"],
  Chery: ["Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5", "Arrizo 6"],
  Geely: ["Coolray", "Emgrand", "Okavango", "Monjaro", "Tugella", "Azkarra"],
  Haval: ["H6", "H6 GT", "Jolion", "Dargo", "H9"],
  Jetour: ["X70", "X90", "Dashing", "T2"],
  MG: ["MG ZS", "MG5", "MG6", "MG RX5", "MG HS", "MG GT", "MG4", "Cyberster"],
  BYD: ["Atto 3", "Han", "Tang", "Seal", "Song Plus", "Dolphin", "Qin Plus"],
  GAC: ["GS3", "GS4", "GS8", "Empow", "GN8"],
  Hongqi: ["H5", "H9", "HS5", "HS7", "E-HS9"],
  Tank: ["300", "500"],
  Exeed: ["TXL", "VX", "LX"],
  Lynk: ["01", "03", "05"],
  Zeekr: ["001", "007", "X"],
};

export const BUILTIN_MAKES = Object.keys(BUILTIN_CARS);

// Same idea as the database check: spelling is matched without caring about capitals.
export const findMake = (makes, name) => makes.find((m) => m.toLowerCase() === String(name || "").trim().toLowerCase()) || null;
export const findModel = (models, name) => models.find((m) => m.toLowerCase() === String(name || "").trim().toLowerCase()) || null;

// Years people can pick: newest first, back to 1950.
export const carYears = () => {
  const top = new Date().getFullYear() + 1;
  return Array.from({ length: top - 1950 + 1 }, (_, i) => String(top - i));
};
