const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM inventory');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get inventory item by product_id
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await db.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if product is available in the requested quantity
router.get('/:productId/check', async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.query;

    if (!quantity || isNaN(parseInt(quantity))) {
      return res.status(400).json({ error: 'Valid quantity parameter is required' });
    }

    const result = await db.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    const isAvailable = product.quantity >= parseInt(quantity);

    res.json({
      product_id: product.product_id,
      name: product.name,
      requested: parseInt(quantity),
      available: product.quantity,
      isAvailable
    });
  } catch (error) {
    console.error('Error checking product availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory quantity (decrease when order is placed)
router.post('/:productId/reserve', async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      return res.status(400).json({ error: 'Valid quantity parameter is required' });
    }

    // First check if product exists and has enough quantity
    const checkResult = await db.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = checkResult.rows[0];

    if (product.quantity < parseInt(quantity)) {
      return res.status(400).json({
        error: 'Insufficient inventory',
        requested: parseInt(quantity),
        available: product.quantity
      });
    }

    // Update the inventory
    const newQuantity = product.quantity - parseInt(quantity);
    const updateResult = await db.query(
      'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING *',
      [newQuantity, productId]
    );

    res.json({
      message: 'Inventory updated successfully',
      product: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new endpoint that will sometimes fail (for testing circuit breaker)
router.get('/test/flaky', (req, res) => {
  console.log('Flaky endpoint called - deciding whether to fail...');

  // Randomly fail about 70% of the time to make testing easier
  if (Math.random() < 0.7) {
    console.log('Flaky endpoint FAILING with 500 error');
    return res.status(500).json({ error: 'Random server error for testing' });
  }

  // Otherwise succeed
  console.log('Flaky endpoint SUCCEEDING with 200 response');
  res.json({ message: 'Service is working correctly' });
});

module.exports = router;
