const { expressjwt } = require('express-jwt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;

    console.log("JWT Secret:", secret);
    console.log("API URL:", api);

    if (!secret) {
        throw new Error("JWT secret is missing. Check your .env file.");
    }

    const unprotectedPaths = [
        { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
        { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
        { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
        { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'OPTIONS', 'POST'] },
        { url: /\/api\/v1\/recommendations\/(.*)/, methods: ['GET', 'OPTIONS'] },

        `${api}/users/login`,
        `${api}/users/register`,
    ];

    const jwtMiddleware = expressjwt({
        secret: secret,
        algorithms: ['HS256'],
        requestProperty: "auth",
        getToken: (req) => {
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                return req.headers.authorization.split(' ')[1];
            }
            return null;
        },
        isRevoked: isRevoked
    });

    return (req, res, next) => {
        console.log("Incoming Token:", req.headers.authorization);

        // Skip token validation for unprotected paths
        const isUnprotected = unprotectedPaths.some(path =>
            (typeof path === "string" && req.originalUrl.startsWith(path)) ||
            (path.url && path.url.test(req.originalUrl) && path.methods.includes(req.method))
        );

        if (isUnprotected) {
            // console.log(`Skipping authentication for: ${req.originalUrl}`);
            return next();
        }

        // Continue with JWT middleware for protected routes
        jwtMiddleware(req, res, (err) => {
            if (err) {
                console.error("JWT Middleware Error:", err);
                return res.status(401).json({ message: "Unauthorized", error: err.message });
            }

            console.log("Decoded JWT Payload (req.auth):", req.auth);

            if (!req.auth) {
                console.warn("JWT Payload is missing, rejecting request.");
                return res.status(401).json({ message: "Invalid token" });
            }

            req.user = req.auth;
            next();
        });
    };
}

const adminOnlyRoutes = [
    '/api/v1/recommendations/chatbot',
    '/api/v1/users',
    '/api/v1/categories',

    // Add other admin-only routes here
];

async function isRevoked(req, token) {
    console.log("Checking if token is revoked:", token);

    if (!token || !token.payload) {
        console.warn("Invalid token structure, rejecting request.");
        return true;
    }

    // Check if the current route is admin-only
    const isAdminRoute = adminOnlyRoutes.some(route => req.originalUrl.startsWith(route));

    // Restrict access to admin routes for non-admin users
    if (isAdminRoute && !token.payload.isAdmin) {
        console.warn("Access denied: User is not an admin.");
        return true;
    }

    return false;
}


module.exports = authJwt;
