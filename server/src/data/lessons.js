// Quiz answers live only on the server. `answer` is the index of the correct option.
export const PASS_PCT = 70;

export const LESSONS = [
  {
    id: "bitcoin-basics", title: "What is Bitcoin?", level: "Beginner", minutes: 5, kind: "lesson",
    summary: "Digital money with no central issuer, a fixed supply and a public ledger.",
    sections: [
      { heading: "Money without a middleman", body: "Bitcoin lets people send value directly over the internet. No bank or company runs it. Thousands of computers (nodes) independently check every rule." },
      { heading: "Fixed supply", body: "No more than 21 million bitcoin will ever exist. New coins are released to miners on a schedule that halves roughly every four years (the 'halving')." },
      { heading: "Divisible", body: "One bitcoin = 100,000,000 satoshis (sats). You never need to buy a whole coin." },
    ],
    quiz: [
      { q: "What is the maximum number of bitcoin that will ever exist?", options: ["1 billion", "21 million", "No limit", "100 million"], answer: 1, explain: "The protocol caps supply at 21 million BTC." },
      { q: "How many satoshis are in one bitcoin?", options: ["1,000", "1,000,000", "100,000,000", "21,000,000"], answer: 2, explain: "1 BTC = 100,000,000 sats." },
      { q: "Who controls the Bitcoin network?", options: ["A central bank", "The company Bitcoin Inc.", "No single party; nodes enforce shared rules", "Miners alone decide everything"], answer: 2, explain: "Nodes independently verify the rules; no single entity controls it." },
    ],
  },
  {
    id: "blockchain-basics", title: "How the blockchain works", level: "Beginner", minutes: 6, kind: "lesson",
    summary: "Blocks, mining and why history is hard to rewrite.",
    sections: [
      { heading: "A chain of blocks", body: "Transactions are grouped into blocks. Each block contains the hash (fingerprint) of the previous block, linking them in a chain." },
      { heading: "Mining (proof of work)", body: "Miners compete to find a valid block by doing lots of computation. On average a new block is found about every 10 minutes." },
      { heading: "Why it's tamper-resistant", body: "Changing an old block changes its hash and breaks every block after it. Rewriting history would require redoing all that work faster than the rest of the network." },
    ],
    quiz: [
      { q: "About how often is a new Bitcoin block found?", options: ["Every second", "Every 10 minutes on average", "Once a day", "Every hour exactly"], answer: 1, explain: "Difficulty adjusts so blocks average ~10 minutes." },
      { q: "What links one block to the previous one?", options: ["The miner's name", "The previous block's hash", "A timestamp only", "A bank signature"], answer: 1, explain: "Each block commits to the previous block's hash." },
      { q: "Why is it hard to change an old transaction?", options: ["It is illegal", "You'd have to redo the proof of work for that block and all later blocks", "Transactions are encrypted", "Old blocks are deleted"], answer: 1, explain: "Rewriting history requires outpacing the network's total work." },
    ],
  },
  {
    id: "transactions-fees", title: "Transactions, fees & confirmations", level: "Beginner", minutes: 6, kind: "lesson",
    summary: "Inputs, outputs, sat/vB fees and what a confirmation means.",
    sections: [
      { heading: "Inputs and outputs", body: "A transaction spends previous outputs (inputs) and creates new outputs. Leftover value usually goes back to you as 'change'." },
      { heading: "Fees", body: "Fee = total inputs − total outputs. Miners prioritise transactions paying more per unit of size, measured in satoshis per virtual byte (sat/vB)." },
      { heading: "Confirmations", body: "A transaction in a block has 1 confirmation; each later block adds one. Many services wait for several confirmations for large amounts." },
    ],
    quiz: [
      { q: "How is a Bitcoin transaction fee calculated?", options: ["A fixed $1", "Total inputs minus total outputs", "1% of the amount", "Set by the receiver"], answer: 1, explain: "Whatever isn't assigned to an output goes to the miner as a fee." },
      { q: "What unit is commonly used for fee rates?", options: ["USD per transaction", "sat/vB", "BTC per hour", "Gas"], answer: 1, explain: "Satoshis per virtual byte." },
      { q: "A transaction just included in the latest block has how many confirmations?", options: ["0", "1", "6", "10"], answer: 1, explain: "Inclusion in a block = 1 confirmation." },
    ],
  },
  {
    id: "keys-wallets", title: "Keys, wallets & self-custody", level: "Beginner", minutes: 6, kind: "lesson",
    summary: "Public vs private keys, seed phrases and how to keep them safe.",
    sections: [
      { heading: "Public vs private", body: "Your address (derived from a public key) is like an account number you can share. Your private key authorises spending. Whoever has it controls the funds." },
      { heading: "Seed phrase", body: "Most wallets back up keys as 12 or 24 words. Anyone with those words can take your bitcoin. Store them offline. Never type them into websites, chats or 'support' forms." },
      { heading: "Custody", body: "Coins on an exchange are held by the exchange ('not your keys, not your coins'). Self-custody gives control but also full responsibility for backups." },
    ],
    quiz: [
      { q: "Which can you safely share to receive bitcoin?", options: ["Seed phrase", "Private key", "Receiving address", "Wallet password"], answer: 2, explain: "Addresses are meant to be shared." },
      { q: "A support agent asks for your 12-word phrase to 'verify your wallet'. You should:", options: ["Send it, they are support", "Send only the first 6 words", "Refuse: it's a scam", "Send it by email instead"], answer: 2, explain: "No legitimate service ever needs your seed phrase." },
      { q: "Where should a seed phrase be stored?", options: ["Screenshot in your gallery", "Offline, e.g. written on paper/metal in a safe place", "In a notes app synced to cloud", "In an email to yourself"], answer: 1, explain: "Keep it offline and private." },
    ],
  },
  {
    id: "scam-dojo", title: "Scam Dojo: spot the scam", level: "Essential", minutes: 7, kind: "scam",
    summary: "Real-world scam patterns: test your instincts.",
    sections: [
      { heading: "Red flags", body: "Guaranteed or 'risk-free' returns, urgency ('only 2 hours left'), requests for seed phrases or remote access, celebrity giveaways, and people you met online pushing a specific platform." },
      { heading: "Common scams", body: "Fake giveaways ('send 0.1 BTC, get 0.2 back'), pig-butchering (romance + fake investment app), phishing sites that copy real wallets, fake support accounts, and pump-and-dump groups." },
      { heading: "If you were scammed", body: "Stop sending money, save evidence, report to your exchange and to the national cyber-crime portal (in India: cybercrime.gov.in / helpline 1930). Beware 'recovery' services; many are scams too." },
    ],
    quiz: [
      { q: "A verified-looking account posts: 'Elon is giving away BTC! Send 0.05 BTC and receive 0.1 BTC back.' This is:", options: ["A legitimate promotion", "A giveaway scam", "An airdrop", "A trading bot"], answer: 1, explain: "Nobody doubles your crypto. Funds sent are gone." },
      { q: "Someone you met on a dating app shows you their huge profits on a new trading site and offers to teach you. The safest move:", options: ["Deposit a small amount to test", "Deposit a lot to maximise gains", "Treat it as a likely 'pig-butchering' scam and disengage", "Share your exchange login so they can help"], answer: 2, explain: "Small early 'withdrawals' are used to build trust before a large loss." },
      { q: "You receive an email: 'Your wallet will be suspended. Click to re-verify your recovery phrase.' You should:", options: ["Click and enter the phrase", "Ignore/report it; wallets never ask for your phrase", "Reply asking for details", "Forward it to friends"], answer: 1, explain: "Classic phishing." },
      { q: "A Telegram group promises '10% daily guaranteed returns'. Which red flag is clearest?", options: ["It uses Telegram", "Guaranteed high returns", "It mentions Bitcoin", "It has many members"], answer: 1, explain: "Guaranteed high returns are the strongest scam signal." },
    ],
  },
  {
    id: "volatility", title: "Understanding volatility", level: "Intermediate", minutes: 5, kind: "lesson",
    summary: "Why Bitcoin's price swings and how to think about drawdowns.",
    sections: [
      { heading: "Big moves are normal", body: "Bitcoin has historically had multiple drawdowns of more than 50% from its highs, as well as large rallies. Past performance does not predict future results." },
      { heading: "Drivers", body: "Liquidity, macro conditions, regulation news, leverage liquidations and sentiment can all move the price. Often no single cause can be confirmed." },
      { heading: "Drawdown maths", body: "A 50% fall needs a 100% gain to recover. Losses and gains are not symmetric." },
    ],
    quiz: [
      { q: "After a 50% loss, what gain is needed to get back to the starting value?", options: ["50%", "75%", "100%", "150%"], answer: 2, explain: "Half the value must double to recover." },
      { q: "Has Bitcoin historically experienced drawdowns larger than 50%?", options: ["Never", "Yes, multiple times", "Only once", "Only before 2010"], answer: 1, explain: "Several cycles saw drawdowns above 50%." },
      { q: "A news headline claims the single reason BTC fell 5% today. The best attitude is:", options: ["Fully trust it", "Treat it as one possible factor; causes are rarely certain", "Sell everything", "Assume it's fake"], answer: 1, explain: "Market moves usually have multiple contributing factors." },
    ],
  },
  {
    id: "risk-management", title: "Risk management basics", level: "Intermediate", minutes: 6, kind: "lesson",
    summary: "Position sizing, diversification and avoiding leverage traps.",
    sections: [
      { heading: "Position sizing", body: "Only risk money you can afford to lose. Decide in advance what share of your savings, if any, belongs in a volatile asset." },
      { heading: "Concentration", body: "Putting everything into one asset means one bad event hurts your whole portfolio. Use the Risk Simulator to see the effect." },
      { heading: "Leverage", body: "Borrowed money magnifies losses and can wipe you out (liquidation) on a modest price move. Beginners should avoid it." },
    ],
    quiz: [
      { q: "With 5x leverage, roughly what price drop could wipe out your position?", options: ["5%", "20%", "50%", "80%"], answer: 1, explain: "1/5 = 20% move against you can liquidate the position (often less due to fees)." },
      { q: "What does 'concentration risk' mean?", options: ["Too many assets", "Large exposure to a single asset", "Trading too slowly", "Using a hardware wallet"], answer: 1, explain: "One asset dominates your outcomes." },
      { q: "Which is a sound beginner principle?", options: ["Invest borrowed money", "Only invest what you can afford to lose", "Follow anonymous tips", "Go all-in after a big rally"], answer: 1, explain: "Limit potential losses to what you can bear." },
    ],
  },
  {
    id: "exchanges-safety", title: "Using exchanges safely", level: "Beginner", minutes: 5, kind: "lesson",
    summary: "2FA, withdrawal checks and choosing reputable, compliant platforms.",
    sections: [
      { heading: "Account security", body: "Use a unique password and app-based 2FA (not SMS where possible). Enable withdrawal address allow-lists if offered." },
      { heading: "Check before you send", body: "Bitcoin transactions can't be reversed. Double-check addresses, send a small test first, and watch out for clipboard malware that swaps addresses." },
      { heading: "Choose carefully", body: "Prefer platforms that are registered with your local regulator (in India, e.g. FIU-IND registration) and have a track record. Registration is not a guarantee of safety." },
    ],
    quiz: [
      { q: "Can a confirmed Bitcoin transaction be reversed by your bank?", options: ["Yes, always", "No", "Only within 24 hours", "Only for small amounts"], answer: 1, explain: "On-chain transactions are final." },
      { q: "Best 2FA option generally?", options: ["SMS", "Authenticator app or security key", "Email only", "No 2FA"], answer: 1, explain: "SMS is vulnerable to SIM-swap attacks." },
      { q: "Before sending a large amount to a new address you should:", options: ["Send everything at once", "Send a small test and verify the address", "Share the address publicly", "Use the highest leverage"], answer: 1, explain: "Test transactions limit costly mistakes." },
    ],
  },
];

export const publicLesson = ({ quiz, ...l }) => ({
  ...l,
  questionCount: quiz.length,
  quiz: quiz.map(({ q, options }) => ({ q, options })),
});

export function scoreQuiz(lesson, answers) {
  const results = lesson.quiz.map((item, i) => ({
    correct: answers[i] === item.answer,
    correctAnswer: item.answer,
    explain: item.explain,
  }));
  const score = Math.round((results.filter((r) => r.correct).length / lesson.quiz.length) * 100);
  return { score, passed: score >= PASS_PCT, results };
}
