# Dzap Auto Bot

A Node.js bot designed to automate the process of bridging ETH tokens between the Sepolia and Arbitrum Sepolia networks using the dzap.io platform. Built for efficiency and ease of use.

---

## 🚀 Features

- **Automated Two-Way Bridging**  
  Automatically executes bridge transactions from Sepolia to Arbitrum Sepolia and vice-versa.

- **Highly Configurable**  
  All settings are managed in a single, easy-to-understand `config.js` file, including:
  - The number of transactions for each direction.
  - The amount of ETH to bridge per transaction.
  - The delay time between transactions.
  - A looping interval to run cycles continuously.

- **Clean CLI Interface**  
  Displays informative and easy-to-read logs directly in your terminal, including balance checks at the start of each cycle.

- **Secure & Efficient**  
  Keeps your private keys safe in a `.env` file, never exposing them in the main codebase.

- **Stable**  
  Uses Node.js's native File System module for maximum compatibility across different environments.

---

## 🏁 Getting Started

### 1. Get RPC URLs

You will need RPC URLs for both testnet networks. You can get them for free from providers like Alchemy or Infura.

- Sepolia RPC URL  
- Arbitrum Sepolia RPC URL  

### 2. Join the AmoureuxID Community

For updates, tips, and other airdrop info:  
🔗 [Join AmoureuxID on Telegram](https://t.me/AmoureuxID)

---

## ⚙️ Installation

### Prerequisites

- Node.js (v18.x or newer is recommended)
- npm

### 1. Clone & Install

```bash
git clone https://github.com/AmoureuxID/Dzap-Auto-Bot.git
cd Dzap-Auto-Bot
npm install
```

### 2. Configuration

#### a. Environment Variables (`.env` file)

Create a `.env` file in the project's root directory. This file will hold your wallet's private key.

```bash
PRIVATE_KEY=0xYourPrivateKey....
```

#### b. Bot Settings (`config.js` file)

Open the `config.js` file and adjust the values to fit your needs. You must fill in your RPC URLs here.

```js
// config.js
export const config = {
    sepoliaRpcUrl: "https://eth-sepolia.g.alchemy.com/v2/YOUR_SEPOLIA_API_KEY",
    arbitrumSepoliaRpcUrl: "https://arb-sepolia.g.alchemy.com/v2/YOUR_ARBITRUM_API_KEY",
    ethToArbCount: 3,
    arbToEthCount: 2,
    bridgeAmount: "0.0001",
    delayBetweenTxSeconds: 30,
    loopIntervalMinutes: 120,
};
```

---

## 🖥️ Usage

Start the bot with the command:

```bash
node index.js
```

**Bot workflow in the terminal:**

- The bot will display a welcome banner.
- It will check and display your ETH balance on both networks.
- It will begin bridging from Sepolia to Arbitrum for the number of times specified in `config.js`.
- Next, it will bridge from Arbitrum back to Sepolia.
- After all tasks are complete, it will start a countdown and repeat the entire process.

---

## 📁 Project Structure

```
Dzap-Auto-Bot/
├── index.js            # The main bot script
├── config.js         # The bot's control panel and settings
├── .env              # File for storing your private key (DO NOT COMMIT)
├── package.json      # Project dependencies
└── README.md         # This documentation file
```

---

## ⚠️ Important Notes

- **For educational purposes only! Use at your own risk.**
- Testnet Instability: Testnet networks can be slow or unstable. If a transaction fails, the bot will log the error and continue to the next task.
- Ensure you have enough testnet ETH on both networks to cover gas fees.

---

## ❓ FAQ & Troubleshooting

- **"Error: PRIVATE_KEY not found..."**  
  Make sure the file is named exactly `.env` and is in the root directory. Confirm the format: `PRIVATE_KEY=0x...`

- **"Failed: transaction chainId mismatch..."**  
  Double-check your RPC URLs match the correct network.

- **"Insufficient balance..."**  
  Your wallet doesn't have enough ETH to cover gas. Use testnet faucets to top up.

---

## 🤗 Contributing

1. Fork this repository.  
2. Create a new feature branch (`git checkout -b feature/NewFeature`).  
3. Commit and push your changes.  
4. Open a Pull Request.

---

## 📜 License & Attribution

For educational purposes only — use at your own risk.  
Developed by **AmoureuxID**.

---

## 📬 Support & Contact

- Telegram: [@AmoureuxID](https://t.me/AmoureuxID)  
- GitHub Issues: [Open an Issue](https://github.com/AmoureuxID/Dzap-Auto-Bot/issues)

---

## 🧋 Buy Me a Coffee

If you find this project helpful, your support is appreciated!

- **EVM:** 0xcee2713694211aF776E0a3c1B0E4d9B5B45167c1  
- **TON:** UQAGw7KmISyrILX807eYYY1sxPofEGBvOUKtDGo8QPtYY_SL  
- **SOL:** 9fYY9YkPmaumkPUSqjD6oaYxvxNo3wETpC9A7nE3Pbza  
- **SUI:** 0x2f4b127951b293e164056b908d05c826011a258f81910f2685a8c433158a7b9b  

---

⭐ If you enjoy this project, please star the repository!

**à la folie.**
