const { ethers, formatUnits, parseEther, JsonRpcProvider } = require('ethers');
const PoolMonitor = require('./poolMonitor.js');
const pool = require('./db.js');
const config = require('./config.json');

// Replace with your actual Base RPC endpoint
const provider = new ethers.JsonRpcProvider(config.rpcUrl);

// Array to hold PoolMonitor instances
const poolMonitors = [];

// Initialize PoolMonitor instances
async function initializeMonitors() {
    for (const poolConfig of config.pools) {
      const monitor = new PoolMonitor(poolConfig, provider, config.alertThresholds);
      await monitor.init(); // Initialize token details
      poolMonitors.push(monitor);
    }
  }

async function monitorPools() {
  await Promise.all(poolMonitors.map((monitor) => monitor.getPoolData()));
}

// Start the monitoring process
(async () => {
  await initializeMonitors();
  monitorPools();
  setInterval(monitorPools, config.fetchInterval); // Fetch data at configured intervals
})();

// Gracefully handle termination
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  pool.end(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});
