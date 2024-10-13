-- database_setup.sql
CREATE TABLE historical_data (
    id SERIAL PRIMARY KEY,
    pool_address VARCHAR NOT NULL,
    timestamp BIGINT NOT NULL,
    token0_symbol VARCHAR NOT NULL,
    token1_symbol VARCHAR NOT NULL,
    price NUMERIC NOT NULL,
    price_change NUMERIC,
    liquidity NUMERIC NOT NULL,
    liquidity_change NUMERIC
);

CREATE INDEX idx_pool_timestamp ON historical_data (pool_address, timestamp);
