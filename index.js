import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';
import axios from 'axios';
import colors from 'colors';
import { config } from './config.js';

let privateKey;
try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const envPath = path.resolve(__dirname, '.env');
    const envFileContent = fs.readFileSync(envPath, { encoding: 'utf-8' });
    const match = envFileContent.match(/^PRIVATE_KEY=(.*)$/m);
    privateKey = match ? match[1].trim() : null;
} catch (error) {
    privateKey = null;
}
if (!privateKey) {
    throw new Error("Gagal membaca PRIVATE_KEY dari file .env! Pastikan file ada dan isinya benar: PRIVATE_KEY=0x...");
}

const sepoliaProvider = new ethers.JsonRpcProvider(config.sepoliaRpcUrl);
const arbitrumProvider = new ethers.JsonRpcProvider(config.arbitrumSepoliaRpcUrl);
const wallet = new ethers.Wallet(privateKey);
const sepoliaWallet = wallet.connect(sepoliaProvider);
const arbitrumWallet = wallet.connect(arbitrumProvider);
const account = wallet.address;
const chainIds = { sepolia: 11155111, arbitrum: 421614 };

const sleep = (seconds) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

const displayBanner = () => {
    console.log(colors.cyan.bold(
`╔═════════════════════════════════════════════╗
║         Dzap Auto Bot - AmoureuxID          ║
╚═════════════════════════════════════════════╝`
    ));
    console.log();
};

const displayBalances = async () => {
    try {
        const [sepoliaWei, arbitrumWei] = await Promise.all([
            sepoliaProvider.getBalance(account),
            arbitrumProvider.getBalance(account)
        ]);
        const sepoliaBalance = ethers.formatEther(sepoliaWei);
        const arbitrumBalance = ethers.formatEther(arbitrumWei);

        console.log(`============ Wallet: ${account.substring(0, 6)}...${account.substring(account.length - 4)} ============`);
        console.log(colors.yellow(`   Sepolia ETH: ${parseFloat(sepoliaBalance).toFixed(6)}`));
        console.log(colors.yellow(`   Arbitrum ETH: ${parseFloat(arbitrumBalance).toFixed(6)}`));
        console.log(`===============================================`);
    } catch (error) {
        console.error(colors.red("Gagal mendapatkan saldo:"), error.message);
    }
};

async function performBridge(fromChainName, toChainName, amountInEth, walletInstance) {
    const fromChainId = chainIds[fromChainName];
    const toChainId = chainIds[toChainName];
    const amountInWei = ethers.parseEther(amountInEth).toString();

    const quotePayload = { fromChain: fromChainId, account, data: [{ amount: amountInWei, destDecimals: 18, destToken: "0x0000000000000000000000000000000000000000", slippage: 1, srcDecimals: 18, srcToken: "0x0000000000000000000000000000000000000000", toChain: toChainId }], integratorId: "dzap" };
    const quoteResponse = await axios.post('https://api.dzap.io/v1/bridge/quote', quotePayload);
    const quoteKey = `${fromChainId}_0x0000000000000000000000000000000000000000-${toChainId}_0x0000000000000000000000000000000000000000`;
    if (!quoteResponse.data[quoteKey]?.recommendedSource) throw new Error("Failed to get route from quote API.");
    const recommendedRoute = quoteResponse.data[quoteKey].recommendedSource;

    const buildTxPayload = { fromChain: fromChainId, data: [{ amount: amountInWei, srcToken: "0x0000000000000000000000000000000000000000", destDecimals: 18, srcDecimals: 18, selectedRoute: recommendedRoute, destToken: "0x0000000000000000000000000000000000000000", slippage: 1, permitData: "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000", recipient: account, toChain: toChainId }], integratorId: "dzap", refundee: account, sender: account, publicKey: account };
    const buildTxResponse = await axios.post('https://api.dzap.io/v1/bridge/buildTx', buildTxPayload);
    const txBuildData = buildTxResponse.data;
    if (txBuildData.status !== 'success') throw new Error(`buildTx API failed: ${JSON.stringify(txBuildData)}`);

    const tx = { to: txBuildData.to, from: txBuildData.from, value: ethers.toBigInt(txBuildData.value), data: txBuildData.data, gasLimit: ethers.toBigInt(txBuildData.gasLimit), chainId: txBuildData.chainId };
    const txResponse = await walletInstance.sendTransaction(tx);
    await txResponse.wait();
    
    const explorerBaseUrl = fromChainName === 'arbitrum' ? 'https://sepolia.arbiscan.io' : `https://sepolia.etherscan.io`;
    return `${explorerBaseUrl}/tx/${txResponse.hash}`;
}

async function runProcess() {
    await displayBalances();

    if (config.ethToArbCount > 0) {
        console.log(`\n--- Starting ${config.ethToArbCount}x SEPOL > ARB ---`);
        for (let i = 1; i <= config.ethToArbCount; i++) {
            try {
                console.log(`▶ [${i}/${config.ethToArbCount}] Bridging ${config.bridgeAmount} ETH...`);
                const link = await performBridge('sepolia', 'arbitrum', config.bridgeAmount, sepoliaWallet);
                console.log(`    ✅ ${link}`);
                console.log(`    ${colors.green('✅')}Claim 5 Points`);
            } catch (error) {
                console.error(`    ❌ [${i}/${config.ethToArbCount}] Failed: ${error.message.substring(0, 120)}...`);
            }
            if (i < config.ethToArbCount) {
                console.log(`    ... Waiting for ${config.delayBetweenTxSeconds} seconds ...`);
                await sleep(config.delayBetweenTxSeconds);
            }
        }
    }

    if (config.arbToEthCount > 0) {
        console.log(`\n--- Starting ${config.arbToEthCount}x ARB > SEPOL ---`);
        for (let i = 1; i <= config.arbToEthCount; i++) {
            try {
                console.log(`▶ [${i}/${config.arbToEthCount}] Bridging ${config.bridgeAmount} ETH...`);
                const link = await performBridge('arbitrum', 'sepolia', config.bridgeAmount, arbitrumWallet);
                console.log(`    ✅ ${link}`);
                console.log(`    ${colors.green('✅')}Claim 5 Points`);
            } catch (error) {
                console.error(`    ❌ [${i}/${config.arbToEthCount}] Failed: ${error.message.substring(0, 120)}...`);
            }
            if (i < config.arbToEthCount) {
                console.log(`    ... Waiting for ${config.delayBetweenTxSeconds} seconds ...`);
                await sleep(config.delayBetweenTxSeconds);
            }
        }
    }

    console.log("\n--- Round Complete ---");
}

async function main() {
    displayBanner();
    await runProcess();

    const intervalMs = config.loopIntervalMinutes * 60 * 1000;
    if (intervalMs > 0) {
        console.log(`\nThe process will repeat every ${config.loopIntervalMinutes} minutes.`);
        setInterval(runProcess, intervalMs);
    } else {
        console.log("\nBot finished because loopIntervalMinutes is set to 0.");
    }
}

main().catch(error => console.error("A fatal error occurred:", error));