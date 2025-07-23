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
    throw new Error("Failed to read PRIVATE_KEY from .env file!");
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
    console.log(`============ Wallet: ${account.substring(0, 6)}...${account.substring(account.length - 4)} ============`);
    try {
        const [sepoliaWei, arbitrumWei] = await Promise.all([
            sepoliaProvider.getBalance(account),
            arbitrumProvider.getBalance(account)
        ]);
        console.log(colors.yellow(`   Sepolia ETH: ${parseFloat(ethers.formatEther(sepoliaWei)).toFixed(6)}`));
        console.log(colors.yellow(`   Arbitrum ETH: ${parseFloat(ethers.formatEther(arbitrumWei)).toFixed(6)}`));
    } catch (e) {
        console.error(colors.red("   Failed to fetch ETH balances."));
    }
    try {
        const loginResponse = await axios.post('https://api.dzap.io/v1/user/login', { account: account, chainType: 'evm' });
        const testnetPoints = loginResponse.data.user.testnetPoints;
        console.log(colors.green(`   Points: ${testnetPoints}`));
    } catch (e) {
        console.log(colors.gray("   Points: Failed to load"));
    }
    try {
        const rankResponse = await axios.get(`https://api.dzap.io/v1/user/rewards-info?account=${account}&chainType=evm`);
        const rank = rankResponse.data.rank;
        console.log(colors.magenta(`   Rank: #${rank}`));
    } catch (e) {
        console.log(colors.gray("   Rank: Failed to load"));
    }
    console.log(`===============================================`);
};

async function apiCallWithRetry(apiCall, stepName) {
    const maxAttempts = 3;
    const retryDelaySeconds = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await apiCall();
            console.log(colors.green(`    ✅ ${stepName}`));
            return result;
        } catch (error) {
            if (attempt < maxAttempts) {
                console.log(colors.yellow(`    ⚠️ ${stepName} failed (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelaySeconds}s...`));
                await sleep(retryDelaySeconds);
            } else {
                const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
                throw new Error(`Failed at ${stepName} step after ${maxAttempts} attempts: ${errorMessage}`);
            }
        }
    }
}

async function performBridge(fromChainName, toChainName, amountInEth, walletInstance) {
    const fromChainId = chainIds[fromChainName];
    const toChainId = chainIds[toChainName];
    const amountInWei = ethers.parseEther(amountInEth).toString();

    const quotePayload = { fromChain: fromChainId, account, data: [{ amount: amountInWei, destDecimals: 18, destToken: "0x0000000000000000000000000000000000000000", slippage: 1, srcDecimals: 18, srcToken: "0x0000000000000000000000000000000000000000", toChain: toChainId }], integratorId: "dzap" };
    const quoteResponse = await apiCallWithRetry(() => axios.post('https://api.dzap.io/v1/bridge/quote', quotePayload), 'Route');
    const quoteKey = `${fromChainId}_0x0000000000000000000000000000000000000000-${toChainId}_0x0000000000000000000000000000000000000000`;
    const recommendedRoute = quoteResponse.data[quoteKey].recommendedSource;
    const destAmount = quoteResponse.data[quoteKey].quoteRates[recommendedRoute].destAmount;

    try {
        const pointsPayload = { account, chainId: fromChainId, srcTokens: [{ address: "0x0000000000000000000000000000000000000000", amount: amountInWei, decimals: 18, chainId: fromChainId }], destTokens: [{ address: "0x0000000000000000000000000000000000000000", amount: destAmount, decimals: 18, chainId: toChainId }], txType: "bridge"};
        await apiCallWithRetry(() => axios.post('https://api.dzap.io/v1/user/calculatePoints', pointsPayload), 'Points');
    } catch(e) {
        console.log(colors.yellow(`    ⚠️ Points API call failed permanently, continuing...`));
    }
    
    const buildTxPayload = { fromChain: fromChainId, data: [{ amount: amountInWei, srcToken: "0x0000000000000000000000000000000000000000", destDecimals: 18, srcDecimals: 18, selectedRoute: recommendedRoute, destToken: "0x0000000000000000000000000000000000000000", slippage: 1, permitData: "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000", recipient: account, toChain: toChainId }], integratorId: "dzap", refundee: account, sender: account, publicKey: account };
    const buildTxResponse = await apiCallWithRetry(() => axios.post('https://api.dzap.io/v1/bridge/buildTx', buildTxPayload), 'BuildTx');
    const txBuildData = buildTxResponse.data;
    if (txBuildData.status !== 'success') throw new Error(`BuildTx API returned status 'failed'`);

    const tx = { to: txBuildData.to, from: txBuildData.from, value: ethers.toBigInt(txBuildData.value), data: txBuildData.data, gasLimit: ethers.toBigInt(txBuildData.gasLimit), chainId: txBuildData.chainId };
    const txResponse = await walletInstance.sendTransaction(tx);
    await txResponse.wait();
    console.log(colors.green('    ✅ TX Confirmed'));
    
    await apiCallWithRetry(() => axios.get(`https://api.dzap.io/v1/bridge/status?txHash=${txResponse.hash}&chainId=${fromChainId}`), 'Status');

    const explorerBaseUrl = fromChainName === 'arbitrum' ? 'https://sepolia.arbiscan.io' : `https://sepolia.etherscan.io`;
    return `${explorerBaseUrl}/tx/${txResponse.hash}`;
}

async function runProcess() {
    await displayBalances();
    if (config.ethToArbCount > 0) {
        console.log(`\n----- Starting ${config.ethToArbCount}x Bridge from SEPOL > ARB -----`);
        for (let i = 1; i <= config.ethToArbCount; i++) {
            try {
                console.log(`▶ [${i}/${config.ethToArbCount}] Bridging ${config.ethToArbAmount} ETH...`);
                const link = await performBridge('sepolia', 'arbitrum', config.ethToArbAmount, sepoliaWallet);
                console.log(`    ${colors.green('✅')} ${link}`);
                console.log(`    ${colors.green('✅')}Claim 5 Points`);
            } catch (error) {
                console.error(`    ❌ [${i}/${config.ethToArbCount}] Failed: ${error.message.substring(0, 150)}...`);
            }
            if (i < config.ethToArbCount) {
                console.log(`    ... Waiting for ${config.delayBetweenTxSeconds} seconds ...`);
                await sleep(config.delayBetweenTxSeconds);
            }
        }
    }

    if (config.arbToEthCount > 0) {
        console.log(`\n----- Starting ${config.arbToEthCount}x Bridge from ARB > SEPOL -----`);
        for (let i = 1; i <= config.arbToEthCount; i++) {
            try {
                console.log(`▶ [${i}/${config.arbToEthCount}] Bridging ${config.arbToEthAmount} ETH...`);
                const link = await performBridge('arbitrum', 'sepolia', config.arbToEthAmount, arbitrumWallet);
                console.log(`    ${colors.green('✅')} ${link}`);
                console.log(`    ${colors.green('✅')}Claim 5 Points`);
            } catch (error) {
                console.error(`    ❌ [${i}/${config.arbToEthCount}] Failed: ${error.message.substring(0, 150)}...`);
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