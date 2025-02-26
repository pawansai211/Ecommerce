const jwt = require('jsonwebtoken'); // Use jsonwebtoken instead of express-jwt
require('dotenv').config();

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;

    console.log("JWT Secret:", secret);
    console.log("API URL:", api);

    if (!secret) {
        throw new Error("JWT secret is missing. Check your .env file.");
    }

    return (req, res, next) => {
        // Check if Authorization header exists
        if (!req.headers.authorization) {
            console.log("No Authorization Header Found");
            return res.status(401).json({ error: "Unauthorized: No token provided" });
        }

        // Extract JWT token from Authorization header
        const token = req.headers.authorization.split(" ")[1];

        if (!token) {
            console.log("Token missing from Authorization header.");
            return res.status(401).json({ error: "Unauthorized: Token missing" });
        }

        try {
            // Verify the JWT and attach user data to req.user
            const decoded = jwt.verify(token, secret);
            req.user = decoded;
            console.log("Authenticated User:", req.user);

            next(); // Allow request to proceed
        } catch (error) {
            console.log("JWT Verification Failed:", error.message);
            return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }
    };
}


async function isRevoked(req, token) {
    console.log("Checking if token is revoked:", token);

    // Allow all users (modify if you need to block specific roles)
    return false;
}

module.exports = authJwt;
