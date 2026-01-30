const prefixes = [
  "Ae", "Al", "Ar", "Az", "Bal", "Bel", "Bor", "Cal", "Cor", "Cyr",
  "Dal", "Dor", "El", "Er", "Fal", "Fel", "Gal", "Gar", "Gil", "Gor",
  "Hal", "Hel", "Il", "Ir", "Kal", "Kar", "Kol", "Lar", "Lor", "Lys",
  "Mal", "Mar", "Mel", "Mor", "Nal", "Nor", "Or", "Pel", "Por", "Ral",
  "Ren", "Ril", "Sal", "Sel", "Sil", "Sol", "Tal", "Ter", "Thal", "Tor",
  "Val", "Vel", "Vor", "Wyn", "Xal", "Zel", "Zor"
];

const middles = [
  "", "", "", // Empty options for shorter names
  "a", "e", "i", "o", "u",
  "an", "en", "in", "on", "un",
  "ar", "er", "ir", "or", "ur",
  "al", "el", "il", "ol", "ul",
  "ath", "eth", "ith", "oth",
  "and", "end", "ind", "ond",
  "ast", "est", "ist", "ost"
];

const suffixes = [
  "a", "ia", "ea", "ora", "ara", "ira",
  "is", "os", "us", "as", "es",
  "on", "an", "en", "in",
  "heim", "holm", "dale", "vale", "fell",
  "shore", "haven", "port", "reach", "watch",
  "wood", "moor", "wick", "bury", "ton"
];

const islandSuffixes = [
  " Isle", " Island", " Atoll", " Key", " Cay",
  " Reef", " Rock", " Sands", " Shores"
];

const mainlandPrefixes = [
  "The ", "Greater ", "Old ", "New ", "High ", "Low "
];

const mainlandSuffixes = [
  " Mainland", " Continent", " Kingdom", " Realm", " Lands", " Territory", ""
];

const lakePrefixes = [
  "Lake ", "Loch ", "Pond of ", "Pool of ", "Waters of "
];

const lakeSuffixes = [
  " Lake", " Pond", " Pool", " Waters", " Mere"
];

const bayPrefixes = [
  "", "", // Empty for plain names
  "The "
];

const baySuffixes = [
  " Bay", " Cove", " Inlet", " Harbor", " Sound", " Gulf"
];

const adjectives = [
  "Verdant", "Misty", "Golden", "Silver", "Crimson", "Azure", "Emerald",
  "Sapphire", "Amber", "Jade", "Coral", "Obsidian", "Crystal", "Shadowed",
  "Sunlit", "Moonlit", "Starlit", "Ancient", "Forgotten", "Hidden", "Lost",
  "Sacred", "Cursed", "Blessed", "Wild", "Serene", "Tranquil", "Stormy"
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateBaseName(): string {
  const prefix = randomFrom(prefixes);
  const middle = randomFrom(middles);
  const suffix = randomFrom(suffixes);
  return prefix + middle + suffix;
}

export function generateIslandName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    let name: string;
    const style = Math.random();

    if (style < 0.4) {
      // Simple name + island suffix: "Kaloria Isle"
      name = generateBaseName() + randomFrom(islandSuffixes);
    } else if (style < 0.7) {
      // Adjective + base name: "Misty Valorheim"
      name = randomFrom(adjectives) + " " + generateBaseName();
    } else if (style < 0.85) {
      // "Isle of [Name]" style
      name = "Isle of " + generateBaseName();
    } else {
      // "[Name]'s [Suffix]" style
      name = generateBaseName() + "'s " + randomFrom(["Rest", "Refuge", "Haven", "Landing", "Point"]);
    }

    if (!usedNames.has(name)) {
      return name;
    }
    attempts++;
  }
  // Fallback with unique number
  return `Unknown Isle ${usedNames.size + 1}`;
}

export function generateMainlandName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    let name: string;
    const style = Math.random();

    if (style < 0.4) {
      // Base name + mainland suffix
      name = generateBaseName() + randomFrom(mainlandSuffixes);
    } else if (style < 0.7) {
      // "The [Adjective] [Name]"
      name = "The " + randomFrom(adjectives) + " " + generateBaseName();
    } else {
      // Prefix + base name
      name = randomFrom(mainlandPrefixes) + generateBaseName();
    }

    if (!usedNames.has(name)) {
      return name;
    }
    attempts++;
  }
  return `The Mainland`;
}

export function generateLakeName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    let name: string;
    const style = Math.random();

    if (style < 0.35) {
      // "Lake [Name]" style
      name = randomFrom(lakePrefixes) + generateBaseName();
    } else if (style < 0.6) {
      // "[Name] Lake" style
      name = generateBaseName() + randomFrom(lakeSuffixes);
    } else if (style < 0.8) {
      // "[Adjective] [Name] Lake"
      name = randomFrom(adjectives) + " " + generateBaseName() + randomFrom(lakeSuffixes);
    } else {
      // "The [Adjective] Waters"
      name = "The " + randomFrom(adjectives) + " Waters";
    }

    if (!usedNames.has(name)) {
      return name;
    }
    attempts++;
  }
  return `Unknown Lake ${usedNames.size + 1}`;
}

export function generateBayName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    let name: string;
    const style = Math.random();

    if (style < 0.5) {
      // "[Name] Bay" style
      name = randomFrom(bayPrefixes) + generateBaseName() + randomFrom(baySuffixes);
    } else if (style < 0.8) {
      // "[Adjective] [Suffix]" style: "Misty Cove"
      name = randomFrom(adjectives) + randomFrom(baySuffixes);
    } else {
      // "The [Name]'s [Suffix]" style
      name = generateBaseName() + "'s" + randomFrom(baySuffixes);
    }

    if (!usedNames.has(name)) {
      return name;
    }
    attempts++;
  }
  return `Unknown Bay ${usedNames.size + 1}`;
}
