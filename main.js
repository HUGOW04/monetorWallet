const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { WebhookClient } = require('discord.js');

// Store known tokens with balances
let knownTokens = new Map(); // Using Map to store token mint -> balance

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
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Check each token for changes
        tokenAccounts.value.forEach((tokenAccount) => {
            const accountData = tokenAccount.account.data.parsed.info;
            const tokenBalance = accountData.tokenAmount.uiAmount;
            const tokenMint = accountData.mint;

            // Only process tokens with balance
            if (tokenBalance > 0) {
                // Only notify if this is a completely new token
                if (!knownTokens.has(tokenMint)) {
                    console.log(`New token detected: ${tokenMint}`);
                    console.log(`Balance: ${tokenBalance}`);
                    sendDiscordNotification(tokenMint, tokenBalance, walletAddress);
                }
                // Update the known balance regardless
                knownTokens.set(tokenMint, tokenBalance);
            }
        });

    } catch (error) {
        console.error('Error in getTokenBalances:', error);
    }
}

async function sendDiscordNotification(tokenMint, balance, walletAddress) {
    try {
        const message = {
            content: '🚨 Token Update Alert! 🚨',
            embeds: [{
                title: 'Token Update Detected',
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
    
    try {
        // Initial setup to record existing tokens
        const connection = await tryConnection();
        const pubKey = new PublicKey(WALLET_ADDRESS);
        const initialTokens = await connection.getParsedTokenAccountsByOwner(pubKey, {
            programId: TOKEN_PROGRAM_ID,
        });
        
        // Record all initial tokens with balances
        initialTokens.value.forEach((tokenAccount) => {
            const accountData = tokenAccount.account.data.parsed.info;
            const tokenBalance = accountData.tokenAmount.uiAmount;
            const tokenMint = accountData.mint;
            
            if (tokenBalance > 0) {
                knownTokens.set(tokenMint, tokenBalance);
                console.log(`Initial token recorded: ${tokenMint} (${tokenBalance})`);
            }
        });
        
        console.log(`Initial setup complete. Monitoring for new tokens...`);
        
        // Continue monitoring every 60 seconds
        setInterval(() => {
            getTokenBalances(WALLET_ADDRESS);
        }, 60000);
        
    } catch (error) {
        console.error('Error starting monitoring:', error);
        process.exit(1);
    }
}

startMonitoring().catch(console.error);
