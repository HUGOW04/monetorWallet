const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { WebhookClient } = require('discord.js');

// Store known tokens
let knownTokens = new Set();

// Discord webhook configuration
const DISCORD_WEBHOOK_URL = '';
const webhookClient = new WebhookClient({ url: DISCORD_WEBHOOK_URL });

// RPC endpoints - we'll try these in order if one fails
const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://ssc-dao.genesysgo.net'
];

async function tryConnection() {
    for (const endpoint of RPC_ENDPOINTS) {
        try {
            const connection = new Connection(endpoint, 'confirmed');
            // Test the connection
            await connection.getBlockHeight();
            console.log(`Connected successfully to ${endpoint}`);
            return connection;
        } catch (error) {
            console.log(`Failed to connect to ${endpoint}, trying next...`);
        }
    }
    throw new Error('All RPC endpoints failed');
}

async function getTokenBalances(walletAddress) {
    try {
        const connection = await tryConnection();
        const pubKey = new PublicKey(walletAddress);

        // Get all token accounts with retry logic
        let tokenAccounts;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
                    programId: TOKEN_PROGRAM_ID,
                });
                break;
            } catch (error) {
                if (attempt === 3) throw error;
                console.log(`Attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            }
        }

        // Check each token
        tokenAccounts.value.forEach((tokenAccount) => {
            const accountData = tokenAccount.account.data.parsed.info;
            const tokenBalance = accountData.tokenAmount.uiAmount;
            const tokenMint = accountData.mint;

            if (!knownTokens.has(tokenMint) && tokenBalance > 0) {
                console.log(`New token detected: ${tokenMint}`);
                console.log(`Balance: ${tokenBalance}`);
                sendDiscordNotification(tokenMint, tokenBalance, walletAddress);
                knownTokens.add(tokenMint);
            }
        });

    } catch (error) {
        console.error('Error in getTokenBalances:', error);
        // If we hit an error, we'll try again in the next interval
    }
}

async function sendDiscordNotification(tokenMint, balance, walletAddress) {
    try {
        const message = {
            content: '🚨 New Token Alert! 🚨',
            embeds: [{
                title: 'New Token Detected',
                color: 0x00ff00,
                fields: [
                    {
                        name: 'Token Mint',
                        value: tokenMint,
                        inline: false
                    },
                    {
                        name: 'Balance',
                        value: balance.toString(),
                        inline: true
                    },
                    {
                        name: 'Wallet',
                        value: walletAddress,
                        inline: true
                    },
                    {
                        name: 'Explorer Link',
                        value: `https://solscan.io/token/${tokenMint}`,
                        inline: false
                    }
                ],
                timestamp: new Date()
            }]
        };

        await webhookClient.send(message);
        console.log('Discord notification sent successfully');
    } catch (error) {
        console.error('Error sending Discord notification:', error);
    }
}

async function startMonitoring() {
    const WALLET_ADDRESS = '';
    
    console.log('Starting token monitoring...');
    
    // Initial scan with retry logic
    let retries = 3;
    while (retries > 0) {
        try {
            const connection = await tryConnection();
            const pubKey = new PublicKey(WALLET_ADDRESS);
            const initialTokens = await connection.getParsedTokenAccountsByOwner(pubKey, {
                programId: TOKEN_PROGRAM_ID,
            });
            
            initialTokens.value.forEach((tokenAccount) => {
                const tokenMint = tokenAccount.account.data.parsed.info.mint;
                knownTokens.add(tokenMint);
            });
            
            console.log(`Initial scan complete. Monitoring ${knownTokens.size} tokens...`);
            break;
        } catch (error) {
            retries--;
            if (retries === 0) {
                console.error('Failed to complete initial scan after 3 attempts');
                process.exit(1);
            }
            console.log(`Initial scan failed, retrying... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Check every 60 seconds
    setInterval(() => {
        getTokenBalances(WALLET_ADDRESS);
    }, 60000);
}

startMonitoring().catch(console.error);
