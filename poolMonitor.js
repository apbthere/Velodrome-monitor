// poolMonitor.js


//import { ethers } from 'ethers';
const { ethers, formatUnits, parseEther, JsonRpcProvider } = require('ethers');
const pool = require('./db.js');
const notifier = require('./notifier.js');

class PoolMonitor {
  constructor(poolConfig, provider, thresholds) {
    this.poolAddress = poolConfig.address;
    this.provider = provider;
    this.priceTokenPreference = poolConfig.priceToken; // "token0" or "token1"
    this.priceChangeThreshold = thresholds.priceChange;
    this.liquidityChangeThreshold = thresholds.liquidityChange;
    this.priceAlertSent = false;
    this.liquidityAlertSent = false;
    this.lastPriceAlertTime = 0;
    this.lastLiquidityAlertTime = 0;
    this.poolAbi = [
      'function getReserves() view returns (uint256 _reserve0, uint256 _reserve1, uint256 _blockTimestampLast)',
      'function token0() view returns (address)',
      'function token1() view returns (address)',
      'event Swap(address indexed sender, address indexed to, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out)',
    ];
    this.erc20Abi = [
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ];
    this.poolContract = new ethers.Contract(this.poolAddress, this.poolAbi, provider);
    this.token0 = null;
    this.token1 = null;
  }

  async init() {
    await this.getTokenDetails();
  }

  async getTokenDetails() {
    const token0Address = await this.poolContract.token0();
    const token1Address = await this.poolContract.token1();

    const token0Contract = new ethers.Contract(token0Address, this.erc20Abi, this.provider);
    const token1Contract = new ethers.Contract(token1Address, this.erc20Abi, this.provider);

    const [decimals0, decimals1, symbol0, symbol1] = await Promise.all([
      token0Contract.decimals(),
      token1Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.symbol(),
    ]);

    this.token0 = {
      address: token0Address,
      decimals: decimals0,
      symbol: symbol0,
      contract: token0Contract,
    };

    this.token1 = {
      address: token1Address,
      decimals: decimals1,
      symbol: symbol1,
      contract: token1Contract,
    };
  }

  async insertHistoricalData(data) {
    try {
      const query = `
        INSERT INTO historical_data (
          pool_address, timestamp, token0_symbol, token1_symbol,
          price, price_change, liquidity, liquidity_change
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      const values = [
        this.poolAddress,
        data.timestamp,
        this.token0.symbol,
        this.token1.symbol,
        data.price,
        data.priceChange,
        data.liquidity,
        data.liquidityChange,
      ];
      await pool.query(query, values);
    } catch (error) {
      console.error('Error inserting historical data:', error);
    }
  }
  async getMaxChanges(currentTime, currentPrice, currentLiquidity) {
    try {
      const oneDayAgo = currentTime - 24 * 60 * 60 * 1000;
  
      // For price changes
      const priceQuery = `
        SELECT
          ((($1 - price) / price) * 100) AS price_change,
          timestamp
        FROM historical_data
        WHERE pool_address = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY price_change DESC
        LIMIT 1
      `;
      const priceDecreaseQuery = `
        SELECT
          ((($1 - price) / price) * 100) AS price_change,
          timestamp
        FROM historical_data
        WHERE pool_address = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY price_change ASC
        LIMIT 1
      `;
  
      // For liquidity changes
      const liquidityQuery = `
        SELECT
          ((($1 - liquidity) / liquidity) * 100) AS liquidity_change,
          timestamp
        FROM historical_data
        WHERE pool_address = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY liquidity_change DESC
        LIMIT 1
      `;
      const liquidityDecreaseQuery = `
        SELECT
          ((($1 - liquidity) / liquidity) * 100) AS liquidity_change,
          timestamp
        FROM historical_data
        WHERE pool_address = $2 AND timestamp BETWEEN $3 AND $4
        ORDER BY liquidity_change ASC
        LIMIT 1
      `;
  
      const priceValues = [currentPrice, this.poolAddress, oneDayAgo, currentTime];
      const liquidityValues = [currentLiquidity, this.poolAddress, oneDayAgo, currentTime];
  
      const [maxPriceIncreaseRes, maxPriceDecreaseRes, maxLiquidityIncreaseRes, maxLiquidityDecreaseRes] = await Promise.all([
        pool.query(priceQuery, priceValues),
        pool.query(priceDecreaseQuery, priceValues),
        pool.query(liquidityQuery, liquidityValues),
        pool.query(liquidityDecreaseQuery, liquidityValues),
      ]);
  
      return {
        max_price_increase: maxPriceIncreaseRes.rows[0]?.price_change || 0,
        max_price_increase_timestamp: maxPriceIncreaseRes.rows[0]?.timestamp || null,
        max_price_decrease: maxPriceDecreaseRes.rows[0]?.price_change || 0,
        max_price_decrease_timestamp: maxPriceDecreaseRes.rows[0]?.timestamp || null,
        max_liquidity_increase: maxLiquidityIncreaseRes.rows[0]?.liquidity_change || 0,
        max_liquidity_increase_timestamp: maxLiquidityIncreaseRes.rows[0]?.timestamp || null,
        max_liquidity_decrease: maxLiquidityDecreaseRes.rows[0]?.liquidity_change || 0,
        max_liquidity_decrease_timestamp: maxLiquidityDecreaseRes.rows[0]?.timestamp || null,
      };
    } catch (error) {
      console.error('Error fetching maximum changes:', error);
      return null;
    }
  }  
  
  async getDataPast24Hours(currentTime) {
    try {
      const oneDayAgo = currentTime - 24 * 60 * 60 * 1000;
  
      const query = `
        SELECT *
        FROM historical_data
        WHERE pool_address = $1 AND timestamp BETWEEN $2 AND $3
      `;
      const values = [
        this.poolAddress,
        oneDayAgo,
        currentTime,
      ];
  
      const res = await pool.query(query, values);
      return res.rows;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }
 

  async deleteOldData(currentTime) {
    try {
      const oneDayAgo = currentTime - 24 * 60 * 60 * 1000;
      const query = `
        DELETE FROM historical_data
        WHERE pool_address = $1 AND timestamp < $2
      `;
      await pool.query(query, [this.poolAddress, oneDayAgo]);
    } catch (error) {
      console.error('Error deleting old data:', error);
    }
  }

  calculatePercentageChange(currentValue, pastValue) {
    return ((currentValue - pastValue) / pastValue) * 100;
  }

  async getPoolData() {
    try {
      const [_reserve0, _reserve1] = await this.poolContract.getReserves();
  
      const token0Reserve = parseFloat(
        ethers.formatUnits(_reserve0, this.token0.decimals)
      );
      const token1Reserve = parseFloat(
        ethers.formatUnits(_reserve1, this.token1.decimals)
      );
  
      let price;
      let baseTokenSymbol;
      let quoteTokenSymbol;
  
      // Determine which token to use as the base and quote
      if (this.priceTokenPreference === 'token0') {
        // Price of token0 in terms of token1 (token1 per token0)
        price = token1Reserve / token0Reserve;
        baseTokenSymbol = this.token0.symbol;
        quoteTokenSymbol = this.token1.symbol;
      } else if (this.priceTokenPreference === 'token1') {
        // Price of token1 in terms of token0 (token0 per token1)
        price = token0Reserve / token1Reserve;
        baseTokenSymbol = this.token1.symbol;
        quoteTokenSymbol = this.token0.symbol;
      } else {
        throw new Error(`Invalid priceTokenPreference: ${this.priceTokenPreference}`);
      }
  
      const liquidity = token0Reserve + token1Reserve;
      const currentTime = Date.now();
  
      // Get maximum changes and timestamps from the database
      const maxChanges = await this.getMaxChanges(currentTime, price, liquidity);
  
      let maxPriceChange = 0;
      let maxPriceChangeTimestamp = null;
      let priceChangeDirection = '';
  
      let maxLiquidityChange = 0;
      let maxLiquidityChangeTimestamp = null;
      let liquidityChangeDirection = '';
  
      if (maxChanges) {
        // Extract data
        const maxPriceIncrease = parseFloat(maxChanges.max_price_increase) || 0;
        const maxPriceIncreaseTimestamp = parseInt(maxChanges.max_price_increase_timestamp) || null;
        const maxPriceDecrease = parseFloat(maxChanges.max_price_decrease) || 0;
        const maxPriceDecreaseTimestamp = parseInt(maxChanges.max_price_decrease_timestamp) || null;
  
        const maxLiquidityIncrease = parseFloat(maxChanges.max_liquidity_increase) || 0;
        const maxLiquidityIncreaseTimestamp = parseInt(maxChanges.max_liquidity_increase_timestamp) || null;
        const maxLiquidityDecrease = parseFloat(maxChanges.max_liquidity_decrease) || 0;
        const maxLiquidityDecreaseTimestamp = parseInt(maxChanges.max_liquidity_decrease_timestamp) || null;
  
        // Determine maximum price change and direction
        if (Math.abs(maxPriceIncrease) >= Math.abs(maxPriceDecrease)) {
          maxPriceChange = maxPriceIncrease;
          maxPriceChangeTimestamp = maxPriceIncreaseTimestamp;
          priceChangeDirection = 'increased';
        } else {
          maxPriceChange = maxPriceDecrease;
          maxPriceChangeTimestamp = maxPriceDecreaseTimestamp;
          priceChangeDirection = 'decreased';
        }
  
        // Determine maximum liquidity change and direction
        if (Math.abs(maxLiquidityIncrease) >= Math.abs(maxLiquidityDecrease)) {
          maxLiquidityChange = maxLiquidityIncrease;
          maxLiquidityChangeTimestamp = maxLiquidityIncreaseTimestamp;
          liquidityChangeDirection = 'increased';
        } else {
          maxLiquidityChange = maxLiquidityDecrease;
          maxLiquidityChangeTimestamp = maxLiquidityDecreaseTimestamp;
          liquidityChangeDirection = 'decreased';
        }
      }
  
      // Insert current data into the database
      await this.insertHistoricalData({
        timestamp: currentTime,
        price,
        priceChange: null, // Not applicable here
        liquidity,
        liquidityChange: null, // Not applicable here
        baseTokenSymbol,
        quoteTokenSymbol,
      });
  
      // Delete old data
      await this.deleteOldData(currentTime);
  
      // Define ANSI color codes
      const RESET = '\x1b[0m';
      const BOLD = '\x1b[1m';
  
      const FG_RED = '\x1b[31m';
      const FG_GREEN = '\x1b[32m';
      const FG_YELLOW = '\x1b[33m';
      const FG_BLUE = '\x1b[34m';
  
      // Output current data with colors
      console.log(`${BOLD}\nPool: ${this.poolAddress}${RESET}`);
      console.log(`${FG_BLUE}Token0 (${this.token0.symbol}) Reserve: ${token0Reserve}${RESET}`);
      console.log(`${FG_BLUE}Token1 (${this.token1.symbol}) Reserve: ${token1Reserve}${RESET}`);
      console.log(`${FG_GREEN}Price (${quoteTokenSymbol} per ${baseTokenSymbol}): ${price}${RESET}`);
  
      // Output maximum percentage changes
      console.log(`${FG_YELLOW}Maximum price change over the past 24 hours: ${maxPriceChange.toFixed(2)}% (${priceChangeDirection})${RESET}`);
      if (maxPriceChangeTimestamp) {
        console.log(`Occurred at: ${new Date(maxPriceChangeTimestamp).toLocaleString()}`);
      }
  
      console.log(`${FG_YELLOW}Maximum liquidity change over the past 24 hours: ${maxLiquidityChange.toFixed(2)}% (${liquidityChangeDirection})${RESET}`);
      if (maxLiquidityChangeTimestamp) {
        console.log(`Occurred at: ${new Date(maxLiquidityChangeTimestamp).toLocaleString()}`);
      }
  
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      
      // Check if maximum changes exceed thresholds and send alerts
      if (Math.abs(maxPriceChange) >= this.priceChangeThreshold) {
        const currentTime = Date.now();
        if (
          !this.priceAlertSent ||
          (currentTime - this.lastPriceAlertTime) >= THREE_HOURS
        ) {
          const alertMessage = `⚠️ *Price Alert*\n` +
            `*Pool*: ${this.token0.symbol}/${this.token1.symbol}\n` +
            `*Price has ${priceChangeDirection} by*: *${Math.abs(maxPriceChange).toFixed(2)}%*\n` +
            `*Threshold*: ${this.priceChangeThreshold}%\n` +
            `*Current Price* (${quoteTokenSymbol} per ${baseTokenSymbol}): ${price}\n` +
            `*Time*: ${new Date().toLocaleString()}`;
          console.log(`${FG_RED}${alertMessage}${RESET}`);
          await notifier.sendTelegramMessage(alertMessage);
          this.priceAlertSent = true;
          this.lastPriceAlertTime = currentTime;
        }
      } else {
        if (this.priceAlertSent) {
          const alertMessage = `ℹ️ *Price Update*\n` +
            `Price change is back below threshold for pool ${this.token0.symbol}/${this.token1.symbol}\n` +
            `*Current Price* (${quoteTokenSymbol} per ${baseTokenSymbol}): ${price}\n` +
            `*Time*: ${new Date().toLocaleString()}`;
          console.log(`${FG_GREEN}${alertMessage}${RESET}`);
          // Optionally send a notification when the condition returns to normal
          await notifier.sendTelegramMessage(alertMessage);
          this.priceAlertSent = false;
          this.lastPriceAlertTime = 0;
        }
      }
  
      if (Math.abs(maxLiquidityChange) >= this.liquidityChangeThreshold) {
        const currentTime = Date.now();
        if (
          !this.liquidityAlertSent ||
          (currentTime - this.lastLiquidityAlertTime) >= THREE_HOURS
        ) {
          const alertMessage = `⚠️ *Liquidity Alert*\n` +
            `*Pool*: ${this.token0.symbol}/${this.token1.symbol}\n` +
            `*Liquidity has ${liquidityChangeDirection} by*: *${Math.abs(maxLiquidityChange).toFixed(2)}%*\n` +
            `*Threshold*: ${this.liquidityChangeThreshold}%\n` +
            `*Current Liquidity*: ${liquidity}\n` +
            `*Time*: ${new Date().toLocaleString()}`;
          console.log(`${FG_RED}${alertMessage}${RESET}`);
          await notifier.sendTelegramMessage(alertMessage);
          this.liquidityAlertSent = true;
          this.lastLiquidityAlertTime = currentTime;
        }
      } else {
        if (this.liquidityAlertSent) {
          const alertMessage = `ℹ️ *Liquidity Update*\n` +
            `Liquidity change is back below threshold for pool ${this.token0.symbol}/${this.token1.symbol}\n` +
            `*Current Liquidity*: ${liquidity}\n` +
            `*Time*: ${new Date().toLocaleString()}`;
          console.log(`${FG_GREEN}${alertMessage}${RESET}`);
          // Optionally send a notification when the condition returns to normal
          await notifier.sendTelegramMessage(alertMessage);
          this.liquidityAlertSent = false;
          this.lastLiquidityAlertTime = 0;
        }
      }
  
    } catch (error) {
      console.error(`Error fetching data for pool ${this.poolAddress}:`, error);
    }
  }
  
  
  // Optional: Listen to Swap events
  listenToEvents() {
    this.poolContract.on(
      'Swap',
      async (sender, to, amount0In, amount1In, amount0Out, amount1Out, event) => {
        console.log(`Swap event in pool ${this.poolAddress}:`);
        console.log(`Sender: ${sender}`);
        console.log(`To: ${to}`);
        console.log(
          `Amount ${this.token0.symbol} In: ${ethers.formatUnits(
            amount0In,
            this.token0.decimals
          )}`
        );
        console.log(
          `Amount ${this.token1.symbol} In: ${ethers.formatUnits(
            amount1In,
            this.token1.decimals
          )}`
        );
        console.log(
          `Amount ${this.token0.symbol} Out: ${ethers.formatUnits(
            amount0Out,
            this.token0.decimals
          )}`
        );
        console.log(
          `Amount ${this.token1.symbol} Out: ${ethers.formatUnits(
            amount1Out,
            this.token1.decimals
          )}`
        );
      }
    );
  }
}

module.exports = PoolMonitor;
