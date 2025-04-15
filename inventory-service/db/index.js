const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Using default postgres database
  password: 'root',
  port: 5432,
});

// Initialize the database with required tables
const initDatabase = async () => {
  try {
    // Create inventory table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert some sample data if the table is empty
    const result = await pool.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO inventory (product_id, name, quantity)
        VALUES
          ('PROD-001', 'Laptop', 10),
          ('PROD-002', 'Smartphone', 20),
          ('PROD-003', 'Headphones', 30)
      `);
    }

    console.log('Inventory database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDatabase,
};
