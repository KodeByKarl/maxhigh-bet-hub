export type GameCategory = "slot" | "cards" | "fishing";

export type SlotGame = {
  id: string;
  name: string;
  provider: string;
  thumb: string;
  category: GameCategory;
  tag?: string;
  description: string;
  rating: number;
  reviews: number;
  rtp: string;
  volatility: "Low" | "Medium" | "High" | "Very High";
  maxWin: string;
  minBet: string;
  maxBet: string;
  features: string[];
};

const defaults = {
  provider: "MaxHigh",
  rating: 4.6,
  reviews: 1280,
  rtp: "96.5%",
  volatility: "Medium" as const,
  maxWin: "5,000x",
  minBet: "₱0.20",
  maxBet: "₱100",
  features: ["Free Spins", "Multipliers", "Wilds"],
};

/** MaxHigh original titles with thumbnail art */
export const slotGames: SlotGame[] = [
  {
    ...defaults,
    id: "candy-peak",
    name: "Candy Peak",
    thumb: "/games/candy-peak.png",
    category: "slot",
    tag: "Hot",
    description:
      "Climb the sugar mountain in Candy Peak — a colorful MaxHigh original packed with cascading wins, sticky sweets, and a progressive Peak Bonus. Match candy clusters, unlock free spins, and chase the Super Peak jackpot.",
    rating: 4.9,
    reviews: 4821,
    rtp: "96.8%",
    volatility: "High",
    maxWin: "12,500x",
    minBet: "₱0.10",
    maxBet: "₱250",
    features: ["Cascading Wins", "Peak Bonus", "Sticky Wilds", "Free Spins", "Buy Bonus"],
  },
  {
    ...defaults,
    id: "godly-gates",
    name: "Godly Gates",
    thumb: "/games/godly-gates.png",
    category: "slot",
    tag: "New",
    description:
      "Enter the temple of thunder. Godly Gates rains multipliers from the sky — hit the sacred gates for divine free spins and lightning payouts.",
    rating: 4.8,
    reviews: 2104,
    rtp: "96.4%",
    volatility: "Very High",
    maxWin: "15,000x",
    features: ["Cascading Wins", "Ways", "Free Spins", "Buy Bonus", "Progressive Mult"],
  },
  {
    ...defaults,
    id: "sugar-surge",
    name: "Sugar Surge",
    thumb: "/games/sugar-surge.png",
    category: "slot",
    tag: "Hot",
    description:
      "A sugar rush of tumbling wins. Fill the gumball meter to trigger Surge Mode and explode the reels with candy chaos.",
    rating: 4.7,
    reviews: 3560,
    volatility: "Medium",
    maxWin: "8,000x",
    features: ["Tumble Wins", "Surge Meter", "Free Spins", "Wild Multipliers"],
  },
  {
    ...defaults,
    id: "starlight-ace",
    name: "Starlight Ace",
    thumb: "/games/starlight-ace.png",
    category: "slot",
    tag: "New",
    description:
      "Follow the star princess through magical castles. Land winged wilds and unlock the Super Scatter for starlit free rounds.",
    rating: 4.7,
    reviews: 1890,
    features: ["Super Scatter", "Winged Wilds", "Free Spins", "Expanding Symbols"],
  },
  {
    ...defaults,
    id: "deep-bass",
    name: "Deep Bass",
    thumb: "/games/deep-bass.png",
    category: "fishing",
    description:
      "Dive deep and land the legendary bass. Arcade fishing action with boss fish, multipliers, and coin rain rewards.",
    rating: 4.5,
    reviews: 980,
    volatility: "Medium",
    maxWin: "2,000x",
    features: ["Boss Fish", "Multi-Catch", "Coin Rain", "Power Cannons"],
  },
  {
    ...defaults,
    id: "pup-den",
    name: "Pup Den",
    thumb: "/games/pup-den.png",
    category: "slot",
    description:
      "The pups are loose! Chase bone wilds through the backyard for megaways-style payouts and playful free spins.",
    rating: 4.4,
    reviews: 1420,
    features: ["Bone Wilds", "Free Spins", "Megaways Style", "Respins"],
  },
  {
    ...defaults,
    id: "frontier-gold",
    name: "Frontier Gold",
    thumb: "/games/frontier-gold.png",
    category: "slot",
    tag: "Hot",
    description:
      "Ride into the dusty west for gold-riveted wins. Hold & spin features and cowboy wilds pack the saloon.",
    rating: 4.6,
    reviews: 2210,
    volatility: "High",
    maxWin: "10,000x",
    features: ["Hold & Spin", "Cowboy Wilds", "Gold Collect", "Free Spins"],
  },
  {
    ...defaults,
    id: "fruit-riot",
    name: "Fruit Riot",
    thumb: "/games/fruit-riot.png",
    category: "slot",
    description:
      "Classic fruit energy with a neon twist. Stacked symbols and riot bonuses keep the party spinning.",
    rating: 4.3,
    reviews: 760,
    volatility: "Low",
    maxWin: "2,500x",
    features: ["Stacked Fruit", "Riot Bonus", "Wilds", "Free Spins"],
  },
  {
    ...defaults,
    id: "buffalo-reign",
    name: "Buffalo Reign",
    thumb: "/games/buffalo-reign.png",
    category: "slot",
    tag: "New",
    description:
      "The buffalo rules the desert sunset. Split-color wilds and stampede free spins deliver crown-worthy wins.",
    rating: 4.7,
    reviews: 1675,
    volatility: "High",
    maxWin: "11,000x",
    features: ["Stampede Spins", "Split Wilds", "Free Spins", "Maxi Multipliers"],
  },
  {
    ...defaults,
    id: "fire-spike",
    name: "Fire Spike",
    thumb: "/games/fire-spike.png",
    category: "slot",
    description:
      "Molten reels and diamond heat. Land the Fire Spike for blazing respins and gem jackpots.",
    rating: 4.5,
    reviews: 1120,
    volatility: "High",
    maxWin: "9,000x",
    features: ["Fire Respins", "Diamond Collect", "Hot Multipliers", "Jackpot Gems"],
  },
  {
    ...defaults,
    id: "ace-high",
    name: "Ace High",
    thumb: "/games/ace-high.png",
    category: "cards",
    tag: "New",
    description:
      "Classic high-card showdowns with MaxHigh flair. Beat the dealer, climb the ace ladder, and cash big side bets.",
    rating: 4.6,
    reviews: 890,
    volatility: "Medium",
    maxWin: "500x",
    minBet: "₱1",
    maxBet: "₱500",
    features: ["Side Bets", "Ace Ladder", "Perfect Pair", "Fast Deal"],
  },
  {
    ...defaults,
    id: "royal-deal",
    name: "Royal Deal",
    thumb: "/games/royal-deal.png",
    category: "cards",
    tag: "Hot",
    description:
      "A regal poker experience. Chase royal flushes, crown multipliers, and VIP table limits.",
    rating: 4.8,
    reviews: 1540,
    volatility: "High",
    maxWin: "1,000x",
    minBet: "₱2",
    maxBet: "₱1,000",
    features: ["Royal Flush Boost", "Crown Multipliers", "VIP Tables", "Side Pots"],
  },
  {
    ...defaults,
    id: "blackjack-max",
    name: "Blackjack Max",
    thumb: "/games/blackjack-max.png",
    category: "cards",
    description:
      "MaxHigh blackjack with insurance, double-down, and blazing table speed. Perfect 21s pay enhanced odds.",
    rating: 4.7,
    reviews: 3200,
    volatility: "Low",
    maxWin: "3:2",
    minBet: "₱1",
    maxBet: "₱1,000",
    features: ["Insurance", "Double Down", "Split", "Perfect 21 Bonus"],
  },
  {
    ...defaults,
    id: "poker-peak",
    name: "Poker Peak",
    thumb: "/games/poker-peak.png",
    category: "cards",
    tag: "New",
    description:
      "Texas Hold’em energy at MaxHigh. Climb the peak blinds, hit community board boosts, and own the night.",
    rating: 4.6,
    reviews: 1180,
    volatility: "Medium",
    maxWin: "800x",
    minBet: "₱1",
    maxBet: "₱500",
    features: ["Hold’em Boards", "Blind Boosts", "Side Bets", "Peak Jackpot"],
  },
];

export function gamesByCategory(category: GameCategory) {
  return slotGames.filter((g) => g.category === category);
}

export function getGameById(id: string) {
  return slotGames.find((g) => g.id === id);
}
