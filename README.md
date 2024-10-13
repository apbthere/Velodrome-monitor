# Liquidity Pool Monitor

A Node.js application for monitoring liquidity pools on blockchain networks. The application tracks price and liquidity changes over the past 24 hours, sends alerts when thresholds are exceeded, and logs data to a PostgreSQL database. Alerts are sent via Telegram with detailed information, including token names, price details, and change directions.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Customization](#customization)
- [Dependencies](#dependencies)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Features

- **Monitor Multiple Liquidity Pools**: Track price and liquidity changes for specified pools.
- **Threshold-Based Alerts**: Receive alerts when price or liquidity changes exceed defined thresholds.
- **Detailed Alert Messages**: Alerts include token names, price details, change directions.
- **Telegram Integration**: Send notifications directly to your Telegram account or group.
- **Historical Data Logging**: Store historical data in a PostgreSQL database for analysis.
- **Color-Coded Console Output**: Enhanced readability with ANSI color codes in the console.

---

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (Node Package Manager)
- **PostgreSQL** database
- **Telegram Account**: For receiving alerts
- **Blockchain Node Provider**: Access to a blockchain node (e.g., Infura, Alchemy)
- **Git**: For cloning the repository

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/liquidity-pool-monitor.git
cd liquidity-pool-monitor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

#### a. Create the Database

Log in to PostgreSQL and create a new database:

```sql
CREATE DATABASE your_db_name;
```

#### b. Create the Table

Run the `database_setup.sql` script to create the necessary table:

```bash
psql -U your_db_username -d your_db_name -f database_setup.sql
```

Alternatively, execute the following SQL command:

```sql
CREATE TABLE historical_data (
  id SERIAL PRIMARY KEY,
  pool_address VARCHAR(42) NOT NULL,
  timestamp BIGINT NOT NULL,
  token0_symbol VARCHAR(10),
  token1_symbol VARCHAR(10),
  price DOUBLE PRECISION,
  price_change DOUBLE PRECISION,
  liquidity DOUBLE PRECISION,
  liquidity_change DOUBLE PRECISION,
  base_token_symbol VARCHAR(10),
  quote_token_symbol VARCHAR(10)
);
```

---

## Configuration

All configurations are done through the `config.json` file.

### Edit `config.json`

Update the `config.json` file to specify the pools to monitor, alert thresholds, database credentials, Telegram settings, and other configurations:

```json
{
  "providerUrl": "https://mainnet.infura.io/v3/your-infura-project-id",
  "pools": [
    {
      "address": "0xYourFirstPoolAddress",
      "priceToken": "token0"
    },
    {
      "address": "0xYourSecondPoolAddress",
      "priceToken": "token1"
    }
  ],
  "thresholds": {
    "priceChange": 5,       // Threshold percentage for price change alerts
    "liquidityChange": 5    // Threshold percentage for liquidity change alerts
  },
  "telegram": {
    "botToken": "your_telegram_bot_token",
    "chatIds": [123456789]  // List of your Telegram chat IDs
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "user": "your_db_username",
    "password": "your_db_password",
    "database": "your_db_name"
  },
  "monitorInterval": 60000  // Monitoring interval in milliseconds (e.g., 60000 ms = 1 minute)
}
```

- **`providerUrl`**: Your blockchain provider URL (e.g., Infura, Alchemy).
- **`pools`**: Array of pool configurations:
  - **`address`**: The liquidity pool contract address.
  - **`priceToken`**: The token to use as the base for price calculations (`"token0"` or `"token1"`).
- **`thresholds`**: Alert thresholds for price and liquidity changes.
- **`telegram`**: Telegram bot configuration:
  - **`botToken`**: Your Telegram bot token.
  - **`chatIds`**: List of Telegram chat IDs to receive alerts.
- **`database`**: PostgreSQL database credentials.
- **`monitorInterval`**: The interval at which the pools are monitored (in milliseconds).

---

## Usage

### Run the Application

```bash
node index.js
```

The application will:

- Monitor the specified liquidity pools at regular intervals (default is every minute).
- Log current pool data to the console with color-coded output.
- Send Telegram alerts when price or liquidity changes exceed the specified thresholds.
- Store historical data in the PostgreSQL database.

---

## Customization

### Adjust Monitoring Interval

Modify the monitoring interval in `config.json`:

```json
"monitorInterval": 60000  // 1 minute in milliseconds
```

### Adjust Alert Cooldown Period

In `poolMonitor.js`, you can adjust the alert cooldown period (e.g., reset alerts every 3 hours):

```javascript
const THREE_HOURS = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
```

### Add More Pools

Add additional pools to the `pools` array in `config.json`:

```json
"pools": [
  {
    "address": "0xYourThirdPoolAddress",
    "priceToken": "token0"
  }
  // Add more pools as needed
]
```

### Customize Alert Messages

Modify the alert messages in `poolMonitor.js` to include additional information or adjust formatting.

For example, to include more context:

```javascript
const alertMessage = `⚠️ *Price Alert*\n` +
  `*Pool*: [${this.poolAddress}](https://etherscan.io/address/${this.poolAddress})\n` +
  `*Tokens*: ${this.token0.symbol}/${this.token1.symbol}\n` +
  `*Price has ${priceChangeDirection} by*: *${Math.abs(maxPriceChange).toFixed(2)}%*\n` +
  `*Threshold*: ${this.priceChangeThreshold}%\n` +
  `*Current Price* (${quoteTokenSymbol} per ${baseTokenSymbol}): ${price}\n` +
  `*Time*: ${new Date().toLocaleString()}`;
```

### Use a Different Blockchain Network

- Update the `providerUrl` in `config.json` to point to a different network.
- Ensure that your blockchain provider supports the desired network.

---

## Dependencies

- [Node.js](https://nodejs.org/): JavaScript runtime.
- [ethers.js](https://docs.ethers.io/): Ethereum library for interacting with the blockchain.
- [pg](https://www.npmjs.com/package/pg): PostgreSQL client for Node.js.
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api): Library for interacting with the Telegram Bot API.
- [dotenv](https://www.npmjs.com/package/dotenv): Loads environment variables from a `.env` file (optional if used).
- [node-cron](https://www.npmjs.com/package/node-cron) (optional): For scheduling tasks.

---

## Database Schema

The `historical_data` table schema:

```sql
CREATE TABLE historical_data (
  id SERIAL PRIMARY KEY,
  pool_address VARCHAR(42) NOT NULL,
  timestamp BIGINT NOT NULL,
  token0_symbol VARCHAR(10),
  token1_symbol VARCHAR(10),
  price DOUBLE PRECISION,
  price_change DOUBLE PRECISION,
  liquidity DOUBLE PRECISION,
  liquidity_change DOUBLE PRECISION,
  base_token_symbol VARCHAR(10),
  quote_token_symbol VARCHAR(10)
);
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**: Click the "Fork" button at the top right of the repository page.

2. **Clone Your Fork**:

   ```bash
   git clone https://github.com/yourusername/liquidity-pool-monitor.git
   ```

3. **Create a Feature Branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Your Changes**: Implement your feature or fix.

5. **Commit Your Changes**:

   ```bash
   git commit -am 'Add some feature'
   ```

6. **Push to the Branch**:

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**: Go to the original repository and open a pull request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Contact

For any questions or suggestions, please contact:

- **GitHub**: [apbthere](https://github.com/apbthere)

---

## Troubleshooting

### Common Issues

#### 1. Telegram Alerts Not Received

- **Check Bot Token**: Ensure the `botToken` in `config.json` is correct.
- **Chat IDs**: Verify that `chatIds` in `config.json` include your chat ID(s).
- **Bot Started**: Make sure you've started a conversation with your bot in Telegram.

#### 2. Database Connection Errors

- **Credentials**: Confirm your PostgreSQL credentials in the `config.json` file.
- **Database Running**: Ensure PostgreSQL server is running.

#### 3. Missing Dependencies

- **Install Packages**: Run `npm install` to install all dependencies.

### Logging

- Logs are output to the console.
- You can redirect logs to a file:

  ```bash
  node index.js > logs.txt
  ```

---

## Additional Resources

- **ethers.js Documentation**: [https://docs.ethers.io/](https://docs.ethers.io/)
- **Telegram Bot API**: [https://core.telegram.org/bots/api](https://core.telegram.org/bots/api)
- **PostgreSQL Documentation**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

---

## Acknowledgments

- Thanks to all contributors and open-source projects that made this application possible.

---

## Quick Start Guide

### Telegram Bot Setup

1. **Create a Telegram Bot**:

   - Open Telegram and search for `@BotFather`.
   - Start a chat and send `/newbot`.
   - Follow the instructions to set up your bot and obtain the **bot token**.

2. **Get Your Chat ID**:

   - Start a chat with your bot by searching for its username.
   - Send a message to your bot (e.g., "Hello").
   - Use the following URL in your browser to get updates (replace `your_telegram_bot_token`):

     ```
     https://api.telegram.org/botyour_telegram_bot_token/getUpdates
     ```

   - Look for `"chat":{"id":<YourChatID>,...}` in the response.
   - Note down your chat ID and add it to `config.json`.

### Running the Application

1. **Ensure PostgreSQL is Running**:

   - Start your PostgreSQL server if it's not already running.

2. **Start the Application**:

   ```bash
   node index.js
   ```

3. **Monitor Output**:

   - The console will display pool data and any alerts.
   - Check your Telegram app for alert messages.

---

## File Structure

```
liquidity-pool-monitor/
├── index.js           // Entry point of the application
├── poolMonitor.js     // PoolMonitor class handling pool data and alerts
├── notifier.js        // Notification module for Telegram
├── db.js              // Database connection and query setup
├── config.json        // Configuration file
├── package.json       // NPM package file
├── schema.sql         // SQL script to create the database table
└── README.md          // Documentation (this file)
```

---

## How It Works

1. **Initialization**:

   - `index.js` reads configurations from `config.json`.
   - It creates instances of `PoolMonitor` for each pool specified.

2. **Monitoring Loop**:

   - At each interval, `getPoolData()` is called for each pool.
   - The method fetches current reserves and calculates price and liquidity.

3. **Data Storage**:

   - Current data is inserted into the `historical_data` table.
   - Old data (older than 24 hours) is deleted to maintain the dataset.

4. **Change Calculation**:

   - Maximum price and liquidity changes over the past 24 hours are calculated.
   - The direction of the change (increase or decrease) is determined.

5. **Alerts**:

   - If changes exceed thresholds, alerts are sent via Telegram.
   - Alert states are managed to prevent spamming (e.g., alerts are sent every 3 hours if the condition persists).

6. **Console Output**:

   - Data and alerts are output to the console with color coding for readability.

---

## Need Help?

If you encounter any issues or have questions, feel free to open an issue on GitHub or contact me directly.

---

**Happy Monitoring!**

---
