export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  totalCards: number;
  releaseDate: string;
  setCode: string;
  symbolUrl?: string;
  logoUrl?: string;
  logo?: string;
  symbol?: string;
}

export const pokemonSets: PokemonSet[] = [
  // Original Series
  { id: "base1", name: "Base Set", series: "Original Series", totalCards: 102, releaseDate: "1999-01-09", setCode: "BS" },
  { id: "base2", name: "Jungle", series: "Original Series", totalCards: 64, releaseDate: "1999-06-16", setCode: "JU" },
  { id: "base3", name: "Fossil", series: "Original Series", totalCards: 62, releaseDate: "1999-10-10", setCode: "FO" },
  { id: "base4", name: "Base Set 2", series: "Original Series", totalCards: 130, releaseDate: "2000-02-24", setCode: "B2" },
  { id: "base5", name: "Team Rocket", series: "Original Series", totalCards: 83, releaseDate: "2000-04-24", setCode: "TR" },
  { id: "gym1", name: "Gym Heroes", series: "Original Series", totalCards: 132, releaseDate: "2000-08-14", setCode: "G1" },
  { id: "gym2", name: "Gym Challenge", series: "Original Series", totalCards: 132, releaseDate: "2000-10-16", setCode: "G2" },
  
  // Neo Series
  { id: "neo1", name: "Neo Genesis", series: "Neo Series", totalCards: 111, releaseDate: "2000-12-16", setCode: "N1" },
  { id: "neo2", name: "Neo Discovery", series: "Neo Series", totalCards: 75, releaseDate: "2001-06-01", setCode: "N2" },
  { id: "neo3", name: "Neo Revelation", series: "Neo Series", totalCards: 66, releaseDate: "2001-09-21", setCode: "N3" },
  { id: "neo4", name: "Neo Destiny", series: "Neo Series", totalCards: 113, releaseDate: "2002-02-28", setCode: "N4" },
  
  // Legendary Collection
  { id: "lc1", name: "Legendary Collection", series: "Legendary Collection", totalCards: 110, releaseDate: "2002-05-24", setCode: "LC" },
  
  // e-Card Series
  { id: "ecard1", name: "Expedition Base Set", series: "e-Card Series", totalCards: 165, releaseDate: "2002-09-15", setCode: "EX" },
  { id: "ecard2", name: "Aquapolis", series: "e-Card Series", totalCards: 182, releaseDate: "2003-01-15", setCode: "AQ" },
  { id: "ecard3", name: "Skyridge", series: "e-Card Series", totalCards: 182, releaseDate: "2003-05-12", setCode: "SK" },
  
  // EX Series
  { id: "ex1", name: "EX Ruby & Sapphire", series: "EX Series", totalCards: 109, releaseDate: "2003-07-18", setCode: "RS" },
  { id: "ex2", name: "EX Sandstorm", series: "EX Series", totalCards: 100, releaseDate: "2003-09-18", setCode: "SS" },
  { id: "ex3", name: "EX Dragon", series: "EX Series", totalCards: 100, releaseDate: "2003-11-24", setCode: "DR" },
  { id: "ex4", name: "EX Team Magma vs Team Aqua", series: "EX Series", totalCards: 97, releaseDate: "2004-03-15", setCode: "MA" },
  { id: "ex5", name: "EX Hidden Legends", series: "EX Series", totalCards: 102, releaseDate: "2004-06-14", setCode: "HL" },
  { id: "ex6", name: "EX FireRed & LeafGreen", series: "EX Series", totalCards: 116, releaseDate: "2004-08-30", setCode: "RG" },
  { id: "ex7", name: "EX Team Rocket Returns", series: "EX Series", totalCards: 111, releaseDate: "2004-11-08", setCode: "TRR" },
  { id: "ex8", name: "EX Deoxys", series: "EX Series", totalCards: 108, releaseDate: "2005-02-14", setCode: "DX" },
  { id: "ex9", name: "EX Emerald", series: "EX Series", totalCards: 107, releaseDate: "2005-05-09", setCode: "EM" },
  { id: "ex10", name: "EX Unseen Forces", series: "EX Series", totalCards: 145, releaseDate: "2005-08-22", setCode: "UF" },
  { id: "ex11", name: "EX Delta Species", series: "EX Series", totalCards: 114, releaseDate: "2005-10-31", setCode: "DS" },
  { id: "ex12", name: "EX Legend Maker", series: "EX Series", totalCards: 93, releaseDate: "2006-02-13", setCode: "LM" },
  { id: "ex13", name: "EX Holon Phantoms", series: "EX Series", totalCards: 111, releaseDate: "2006-05-03", setCode: "HP" },
  { id: "ex14", name: "EX Crystal Guardians", series: "EX Series", totalCards: 100, releaseDate: "2006-08-30", setCode: "CG" },
  { id: "ex15", name: "EX Dragon Frontiers", series: "EX Series", totalCards: 101, releaseDate: "2006-11-08", setCode: "DF" },
  { id: "ex16", name: "EX Power Keepers", series: "EX Series", totalCards: 108, releaseDate: "2007-02-14", setCode: "PK" },
  
  // Diamond & Pearl Series
  { id: "dp1", name: "Diamond & Pearl", series: "Diamond & Pearl Series", totalCards: 130, releaseDate: "2007-05-23", setCode: "DP" },
  { id: "dp2", name: "Mysterious Treasures", series: "Diamond & Pearl Series", totalCards: 124, releaseDate: "2007-08-22", setCode: "MT" },
  { id: "dp3", name: "Secret Wonders", series: "Diamond & Pearl Series", totalCards: 132, releaseDate: "2007-11-07", setCode: "SW" },
  { id: "dp4", name: "Great Encounters", series: "Diamond & Pearl Series", totalCards: 106, releaseDate: "2008-02-13", setCode: "GE" },
  { id: "dp5", name: "Majestic Dawn", series: "Diamond & Pearl Series", totalCards: 100, releaseDate: "2008-05-21", setCode: "MD" },
  { id: "dp6", name: "Legends Awakened", series: "Diamond & Pearl Series", totalCards: 146, releaseDate: "2008-08-20", setCode: "LA" },
  { id: "dp7", name: "Stormfront", series: "Diamond & Pearl Series", totalCards: 106, releaseDate: "2008-11-05", setCode: "SF" },
  
  // Platinum Series
  { id: "pl1", name: "Platinum", series: "Platinum Series", totalCards: 133, releaseDate: "2009-02-11", setCode: "PL" },
  { id: "pl2", name: "Rising Rivals", series: "Platinum Series", totalCards: 120, releaseDate: "2009-05-16", setCode: "RR" },
  { id: "pl3", name: "Supreme Victors", series: "Platinum Series", totalCards: 153, releaseDate: "2009-08-19", setCode: "SV" },
  { id: "pl4", name: "Arceus", series: "Platinum Series", totalCards: 111, releaseDate: "2009-11-04", setCode: "AR" },
  
  // HeartGold & SoulSilver Series
  { id: "hgss1", name: "HeartGold & SoulSilver", series: "HeartGold & SoulSilver Series", totalCards: 124, releaseDate: "2010-02-10", setCode: "HS" },
  { id: "hgss2", name: "Unleashed", series: "HeartGold & SoulSilver Series", totalCards: 96, releaseDate: "2010-05-12", setCode: "UL" },
  { id: "hgss3", name: "Undaunted", series: "HeartGold & SoulSilver Series", totalCards: 91, releaseDate: "2010-08-18", setCode: "UD" },
  { id: "hgss4", name: "Triumphant", series: "HeartGold & SoulSilver Series", totalCards: 103, releaseDate: "2010-11-03", setCode: "TM" },
  
  // Call of Legends
  { id: "col1", name: "Call of Legends", series: "Call of Legends Series", totalCards: 106, releaseDate: "2011-02-09", setCode: "CL" },
  
  // Black & White Series
  { id: "bw1", name: "Black & White", series: "Black & White Series", totalCards: 115, releaseDate: "2011-04-25", setCode: "BLW" },
  { id: "bw2", name: "Emerging Powers", series: "Black & White Series", totalCards: 98, releaseDate: "2011-08-31", setCode: "EPO" },
  { id: "bw3", name: "Noble Victories", series: "Black & White Series", totalCards: 102, releaseDate: "2011-11-16", setCode: "NVI" },
  { id: "bw4", name: "Next Destinies", series: "Black & White Series", totalCards: 103, releaseDate: "2012-02-08", setCode: "NXD" },
  { id: "bw5", name: "Dark Explorers", series: "Black & White Series", totalCards: 111, releaseDate: "2012-05-09", setCode: "DEX" },
  { id: "bw6", name: "Dragons Exalted", series: "Black & White Series", totalCards: 128, releaseDate: "2012-08-15", setCode: "DRX" },
  { id: "bw7", name: "Boundaries Crossed", series: "Black & White Series", totalCards: 153, releaseDate: "2012-11-07", setCode: "BCR" },
  { id: "bw8", name: "Plasma Storm", series: "Black & White Series", totalCards: 138, releaseDate: "2013-02-06", setCode: "PLS" },
  { id: "bw9", name: "Plasma Freeze", series: "Black & White Series", totalCards: 122, releaseDate: "2013-05-08", setCode: "PLF" },
  { id: "bw10", name: "Plasma Blast", series: "Black & White Series", totalCards: 105, releaseDate: "2013-08-14", setCode: "PLB" },
  { id: "bw11", name: "Legendary Treasures", series: "Black & White Series", totalCards: 140, releaseDate: "2013-11-06", setCode: "LTR" },
  
  // XY Series
  { id: "xy1", name: "XY Base Set", series: "XY Series", totalCards: 146, releaseDate: "2014-02-05", setCode: "XY" },
  { id: "xy2", name: "Flashfire", series: "XY Series", totalCards: 109, releaseDate: "2014-05-07", setCode: "FLF" },
  { id: "xy3", name: "Furious Fists", series: "XY Series", totalCards: 114, releaseDate: "2014-08-13", setCode: "FFI" },
  { id: "xy4", name: "Phantom Forces", series: "XY Series", totalCards: 124, releaseDate: "2014-11-05", setCode: "PHF" },
  { id: "xy5", name: "Primal Clash", series: "XY Series", totalCards: 164, releaseDate: "2015-02-04", setCode: "PRC" },
  { id: "xy6", name: "Roaring Skies", series: "XY Series", totalCards: 110, releaseDate: "2015-05-06", setCode: "ROS" },
  { id: "xy7", name: "Ancient Origins", series: "XY Series", totalCards: 100, releaseDate: "2015-08-12", setCode: "AOR" },
  { id: "xy8", name: "BREAKthrough", series: "XY Series", totalCards: 164, releaseDate: "2015-11-04", setCode: "BKT" },
  { id: "xy9", name: "BREAKpoint", series: "XY Series", totalCards: 123, releaseDate: "2016-02-03", setCode: "BKP" },
  { id: "xy10", name: "Fates Collide", series: "XY Series", totalCards: 129, releaseDate: "2016-05-02", setCode: "FCO" },
  { id: "xy11", name: "Steam Siege", series: "XY Series", totalCards: 116, releaseDate: "2016-08-03", setCode: "STS" },
  { id: "xy12", name: "Evolutions", series: "XY Series", totalCards: 113, releaseDate: "2016-11-02", setCode: "EVO" },
  
  // Sun & Moon Series
  { id: "sm1", name: "Sun & Moon Base Set", series: "Sun & Moon Series", totalCards: 173, releaseDate: "2017-02-03", setCode: "SM" },
  { id: "sm2", name: "Guardians Rising", series: "Sun & Moon Series", totalCards: 180, releaseDate: "2017-05-05", setCode: "GRI" },
  { id: "sm3", name: "Burning Shadows", series: "Sun & Moon Series", totalCards: 177, releaseDate: "2017-08-04", setCode: "BUS" },
  { id: "sm4", name: "Crimson Invasion", series: "Sun & Moon Series", totalCards: 124, releaseDate: "2017-11-03", setCode: "CIN" },
  { id: "sm5", name: "Ultra Prism", series: "Sun & Moon Series", totalCards: 178, releaseDate: "2018-02-02", setCode: "UPR" },
  { id: "sm6", name: "Forbidden Light", series: "Sun & Moon Series", totalCards: 150, releaseDate: "2018-05-04", setCode: "FLI" },
  { id: "sm7", name: "Celestial Storm", series: "Sun & Moon Series", totalCards: 187, releaseDate: "2018-08-03", setCode: "CES" },
  { id: "sm8", name: "Lost Thunder", series: "Sun & Moon Series", totalCards: 236, releaseDate: "2018-11-02", setCode: "LOT" },
  { id: "sm9", name: "Team Up", series: "Sun & Moon Series", totalCards: 198, releaseDate: "2019-02-01", setCode: "TEU" },
  { id: "sm10", name: "Unbroken Bonds", series: "Sun & Moon Series", totalCards: 234, releaseDate: "2019-05-03", setCode: "UNB" },
  { id: "sm11", name: "Unified Minds", series: "Sun & Moon Series", totalCards: 260, releaseDate: "2019-08-02", setCode: "UNM" },
  { id: "sm12", name: "Cosmic Eclipse", series: "Sun & Moon Series", totalCards: 272, releaseDate: "2019-11-01", setCode: "CEC" },
  
  // Sword & Shield Series
  { id: "swsh1", name: "Sword & Shield Base Set", series: "Sword & Shield Series", totalCards: 216, releaseDate: "2020-02-07", setCode: "SSH" },
  { id: "swsh2", name: "Rebel Clash", series: "Sword & Shield Series", totalCards: 209, releaseDate: "2020-05-01", setCode: "RCL" },
  { id: "swsh3", name: "Darkness Ablaze", series: "Sword & Shield Series", totalCards: 201, releaseDate: "2020-08-14", setCode: "DAA" },
  { id: "swsh4", name: "Vivid Voltage", series: "Sword & Shield Series", totalCards: 203, releaseDate: "2020-11-13", setCode: "VIV" },
  { id: "swsh5", name: "Battle Styles", series: "Sword & Shield Series", totalCards: 183, releaseDate: "2021-03-19", setCode: "BST" },
  { id: "swsh6", name: "Chilling Reign", series: "Sword & Shield Series", totalCards: 233, releaseDate: "2021-06-18", setCode: "CRE" },
  { id: "swsh7", name: "Evolving Skies", series: "Sword & Shield Series", totalCards: 237, releaseDate: "2021-08-27", setCode: "EVS" },
  { id: "swsh8", name: "Fusion Strike", series: "Sword & Shield Series", totalCards: 284, releaseDate: "2021-11-12", setCode: "FST" },
  { id: "swsh9", name: "Brilliant Stars", series: "Sword & Shield Series", totalCards: 216, releaseDate: "2022-02-25", setCode: "BRS" },
  { id: "swsh10", name: "Astral Radiance", series: "Sword & Shield Series", totalCards: 216, releaseDate: "2022-05-27", setCode: "ASR" },
  { id: "swsh11", name: "Lost Origin", series: "Sword & Shield Series", totalCards: 247, releaseDate: "2022-09-09", setCode: "LOR" },
  { id: "swsh12", name: "Silver Tempest", series: "Sword & Shield Series", totalCards: 245, releaseDate: "2022-11-11", setCode: "SIT" },
  { id: "swsh13", name: "Crown Zenith", series: "Sword & Shield Series", totalCards: 230, releaseDate: "2023-01-20", setCode: "CRZ" },
  
  // Scarlet & Violet Series
  { id: "sv1", name: "Scarlet & Violet Base Set", series: "Scarlet & Violet Series", totalCards: 258, releaseDate: "2023-03-31", setCode: "SVI" },
  { id: "sv2", name: "Paldea Evolved", series: "Scarlet & Violet Series", totalCards: 279, releaseDate: "2023-06-09", setCode: "PAL" },
  { id: "sv3", name: "Obsidian Flames", series: "Scarlet & Violet Series", totalCards: 230, releaseDate: "2023-08-11", setCode: "OBF" },
  { id: "sv4", name: "Paradox Rift", series: "Scarlet & Violet Series", totalCards: 266, releaseDate: "2023-11-03", setCode: "PAR" },
  { id: "sv5", name: "Paldean Fates", series: "Scarlet & Violet Series", totalCards: 245, releaseDate: "2024-01-26", setCode: "PAF" },
  { id: "sv6", name: "Temporal Forces", series: "Scarlet & Violet Series", totalCards: 218, releaseDate: "2024-03-22", setCode: "TEF" },
  { id: "sv7", name: "Twilight Masquerade", series: "Scarlet & Violet Series", totalCards: 226, releaseDate: "2024-05-24", setCode: "TWM" },
  { id: "sv8", name: "Shrouded Fable", series: "Scarlet & Violet Series", totalCards: 99, releaseDate: "2024-08-02", setCode: "SFA" },
  { id: "sv9", name: "Stellar Crown", series: "Scarlet & Violet Series", totalCards: 175, releaseDate: "2024-09-13", setCode: "SCR" },
  { id: "sv10", name: "Surging Sparks", series: "Scarlet & Violet Series", totalCards: 252, releaseDate: "2024-11-08", setCode: "SSP" },
  { id: "sv11", name: "Journey Together", series: "Scarlet & Violet Series", totalCards: 203, releaseDate: "2025-03-28", setCode: "JTO" },
  { id: "sv12", name: "Destined Rivals", series: "Scarlet & Violet Series", totalCards: 198, releaseDate: "2025-05-30", setCode: "DRV" },
  
  // Mega Evolution Series
  { id: "me1", name: "Mega Evolution", series: "Mega Evolution Series", totalCards: 188, releaseDate: "2025-09-26", setCode: "MEG" },
  { id: "me2", name: "Phantasmal Flames", series: "Mega Evolution Series", totalCards: 130, releaseDate: "2025-11-14", setCode: "PFL" },
];
