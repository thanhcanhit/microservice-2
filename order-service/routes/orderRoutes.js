const express = require("express");
const router = express.Router();
const axios = require("axios");
const { default: axiosRetry, isNetworkOrIdempotentRequestError } = require("axios-retry");
const CircuitBreaker = require("opossum");
const db = require("../db");

// Configure axios-retry
axiosRetry(axios, {
	retries: 3, // Number of retry attempts
	retryDelay: (retryCount) => {
		console.log(`Retry attempt: ${retryCount}`);
		return retryCount * 1000; // Exponential backoff: 1s, 2s, 3s
	},
	retryCondition: (error) => {
		// Only retry on 5xx errors, not on 4xx errors
		return (
			isNetworkOrIdempotentRequestError(error) ||
			(error.response && error.response.status >= 500)
		);
	},
});

// Configuration for the inventory service
const INVENTORY_SERVICE_URL = "http://localhost:3001/api/inventory";

// Circuit breaker configuration
const circuitBreakerOptions = {
	failureThreshold: 2, // Number of failures before opening circuit (reduced from 3 to 2)
	resetTimeout: 20000, // Time in ms to wait before trying again (increased from 10 to 20 seconds)
	timeout: 5000, // Time in ms before request is considered failed (increased from 3 to 5 seconds)
	errorThresholdPercentage: 50, // Error percentage threshold to trip circuit
	rollingCountTimeout: 60000, // Time window in ms for tracking failure rates (1 minute)
	rollingCountBuckets: 10, // Number of buckets to use for tracking failure rates
};

// Create circuit breaker for inventory check
const inventoryCheckCircuit = new CircuitBreaker(
	async (productId, quantity) => {
		const response = await axios.get(
			`${INVENTORY_SERVICE_URL}/${productId}/check?quantity=${quantity}`
		);
		return response.data;
	},
	circuitBreakerOptions
);

// Create circuit breaker for inventory reservation
const inventoryReserveCircuit = new CircuitBreaker(
	async (productId, quantity) => {
		const response = await axios.post(
			`${INVENTORY_SERVICE_URL}/${productId}/reserve`,
			{ quantity }
		);
		return response.data;
	},
	circuitBreakerOptions
);

// Circuit breaker for the flaky test endpoint
const flakyTestCircuit = new CircuitBreaker(async () => {
	const response = await axios.get(`${INVENTORY_SERVICE_URL}/test/flaky`);
	return response.data;
}, circuitBreakerOptions);

// Set up event listeners for circuit breakers
[inventoryCheckCircuit, inventoryReserveCircuit, flakyTestCircuit].forEach(
	(circuit) => {
		circuit.on("open", () =>
			console.log(`Circuit ${circuit.name} is open (not allowing requests)`)
		);
		circuit.on("close", () =>
			console.log(`Circuit ${circuit.name} is closed (allowing requests)`)
		);
		circuit.on("halfOpen", () =>
			console.log(
				`Circuit ${circuit.name} is half-open (testing if service is back)`
			)
		);
		circuit.on("fallback", (result) =>
			console.log(`Circuit ${circuit.name} fallback executed`, result)
		);
	}
);

// Get all orders
router.get("/", async (req, res) => {
	try {
		const result = await db.query(
			"SELECT * FROM orders ORDER BY created_at DESC"
		);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching orders:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Get order by id
router.get("/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const result = await db.query("SELECT * FROM orders WHERE id = $1", [id]);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Order not found" });
		}

		res.json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching order:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Create a new order with circuit breaker for inventory service
router.post("/", async (req, res) => {
	try {
		const { customer_id, product_id, quantity } = req.body;

		if (!customer_id || !product_id || !quantity) {
			return res
				.status(400)
				.json({ error: "customer_id, product_id, and quantity are required" });
		}

		// Check inventory availability using circuit breaker
		try {
			const inventoryCheck = await inventoryCheckCircuit.fire(
				product_id,
				quantity
			);

			if (!inventoryCheck.isAvailable) {
				return res.status(400).json({
					error: "Product not available in requested quantity",
					requested: quantity,
					available: inventoryCheck.available,
				});
			}

			// Reserve inventory using circuit breaker
			await inventoryReserveCircuit.fire(product_id, quantity);

			// Create the order
			const orderResult = await db.query(
				"INSERT INTO orders (customer_id, product_id, quantity, status) VALUES ($1, $2, $3, $4) RETURNING *",
				[customer_id, product_id, quantity, "confirmed"]
			);

			res.status(201).json(orderResult.rows[0]);
		} catch (error) {
			// Handle circuit breaker errors
			if (
				inventoryCheckCircuit.status === "open" ||
				inventoryReserveCircuit.status === "open"
			) {
				// Create the order with pending status when inventory service is down
				const orderResult = await db.query(
					"INSERT INTO orders (customer_id, product_id, quantity, status) VALUES ($1, $2, $3, $4) RETURNING *",
					[customer_id, product_id, quantity, "pending"]
				);

				return res.status(202).json({
					message:
						"Order created with pending status. Inventory service is currently unavailable.",
					order: orderResult.rows[0],
				});
			}

			// Other errors
			console.error("Error creating order:", error);
			res
				.status(500)
				.json({ error: "Error creating order", details: error.message });
		}
	} catch (error) {
		console.error("Error in order creation:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Test endpoint to demonstrate circuit breaker
router.get("/test/circuit-breaker", async (req, res) => {
	try {
		const result = await flakyTestCircuit.fire();
		res.json({
			message: "Request successful",
			circuitStatus: flakyTestCircuit.status,
			result,
		});
	} catch (error) {
		res.status(500).json({
			message: "Request failed",
			circuitStatus: flakyTestCircuit.status,
			error: error.message,
		});
	}
});

// Get circuit breaker status
router.get("/status/circuit-breaker", (req, res) => {
	res.json({
		inventoryCheck: {
			status: inventoryCheckCircuit.status,
			stats: {
				successful: inventoryCheckCircuit.stats.successes,
				failed: inventoryCheckCircuit.stats.failures,
				rejected: inventoryCheckCircuit.stats.rejects,
				timeout: inventoryCheckCircuit.stats.timeouts,
			},
		},
		inventoryReserve: {
			status: inventoryReserveCircuit.status,
			stats: {
				successful: inventoryReserveCircuit.stats.successes,
				failed: inventoryReserveCircuit.stats.failures,
				rejected: inventoryReserveCircuit.stats.rejects,
				timeout: inventoryReserveCircuit.stats.timeouts,
			},
		},
		flakyTest: {
			status: flakyTestCircuit.status,
			stats: {
				successful: flakyTestCircuit.stats.successes,
				failed: flakyTestCircuit.stats.failures,
				rejected: flakyTestCircuit.stats.rejects,
				timeout: flakyTestCircuit.stats.timeouts,
			},
		},
	});
});

// Test endpoint to demonstrate retry mechanism
router.get("/test/retry", async (req, res) => {
	try {
		// Generate a unique request ID to track retries
		const requestId = Math.floor(Math.random() * 1000000);
		console.log(
			`[Request ID: ${requestId}] Calling flaky endpoint with retry mechanism...`
		);

		// Direct call to flaky endpoint with retry (bypassing circuit breaker)
		const response = await axios.get(`${INVENTORY_SERVICE_URL}/test/flaky`, {
			headers: {
				"X-Request-ID": requestId,
			},
		});

		res.json({
			message: "Request successful after potential retries",
			requestId: requestId,
			data: response.data,
		});
	} catch (error) {
		console.error("All retry attempts failed:", error.message);
		res.status(500).json({
			message: "All retry attempts failed",
			error: error.message,
		});
	}
});

// Test endpoint to demonstrate both circuit breaker and retry
router.get("/test/retry-with-circuit-breaker", async (req, res) => {
	try {
		// Generate a unique request ID to track retries
		const requestId = Math.floor(Math.random() * 1000000);

		// Create a circuit breaker that uses axios with retry
		const retryWithCircuitBreaker = new CircuitBreaker(async () => {
			console.log(
				`[Request ID: ${requestId}] Calling flaky endpoint with retry and circuit breaker...`
			);
			const response = await axios.get(`${INVENTORY_SERVICE_URL}/test/flaky`, {
				headers: {
					"X-Request-ID": requestId,
				},
			});
			return response.data;
		}, circuitBreakerOptions);

		// Add event listeners
		retryWithCircuitBreaker.on("success", () =>
			console.log(`[Request ID: ${requestId}] Request succeeded`)
		);
		retryWithCircuitBreaker.on("failure", () =>
			console.log(`[Request ID: ${requestId}] Request failed after retries`)
		);

		const result = await retryWithCircuitBreaker.fire();
		res.json({
			message: "Request successful with retry and circuit breaker",
			requestId: requestId,
			circuitStatus: retryWithCircuitBreaker.status,
			result,
		});
	} catch (error) {
		res.status(500).json({
			message: "Request failed with retry and circuit breaker",
			error: error.message,
		});
	}
});

module.exports = router;
