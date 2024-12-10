# Solana Token Monitor

A Node.js application that monitors a Solana wallet for new tokens and sends Discord notifications when new tokens are detected. Perfect for tracking airdrops and new token arrivals.

## Features

- Real-time monitoring of Solana wallet for new tokens
- Discord notifications for new token arrivals
- Automatic retry mechanism for failed connections
- Multiple RPC endpoint fallbacks for reliability
- Ignores token removals - only notifies on new arrivals

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)
- A Discord webhook URL
- A Solana wallet address to monitor

## Installation

1. Clone the repository or create a new directory
```bash
mkdir token-monitor
cd token-monitor
```

2. Install the required dependencies
```bash
npm install @solana/web3.js @solana/spl-token discord.js
```

3. Create your main.js file and copy the monitoring code into it

4. Create a configuration:
   - Replace `YOUR_WEBHOOK_URL` with your Discord webhook URL
   - Replace the wallet address with your own if different

## Usage

Run the monitor:
```bash
node main.js
```

The script will:
1. Perform an initial scan of existing tokens
2. Continue monitoring for new tokens
3. Send Discord notifications when new tokens are detected

## Discord Notifications

You'll receive notifications that include:
- Token mint address
- Token balance
- Wallet address
- Solscan explorer link

## Troubleshooting

If you see RPC errors:
- The script will automatically try different RPC endpoints
- Wait for reconnection attempts
- Check your internet connection
- Make sure your Discord webhook URL is correct

## Contributing

Feel free to submit issues and enhancement requests!

## Security Notes

- Keep your Discord webhook URL private
- Don't share your main.js file if it contains your webhook URL
- Consider using environment variables for sensitive data
