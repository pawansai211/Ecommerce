const { expressjwt } = require('express-jwt');
require('dotenv').config();

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;

    console.log("JWT Secret:", secret);
    console.log("API URL:", api);

    if (!secret) {
        throw new Error("JWT secret is missing. Check your .env file.");
    }

    const jwtMiddleware = expressjwt({
        secret: secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked
    }).unless({
        path: [
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'OPTIONS', 'POST'] },
            `${api}/users/login`,
            `${api}/users/register`,
        ]
    });

    return (req, res, next) => {
        jwtMiddleware(req, res, (err) => {
            if (err) {
                console.error("JWT Middleware Error:", err);
                return res.status(401).json({ message: "Unauthorized", error: err.message });
            }

            console.log("Authenticated User:", req.user);

            next();
        });
    };
}

async function isRevoked(req, token) {
    console.log("Checking if token is revoked:", token);
    
    if (token.payload && !token.payload.isAdmin) {
        return true; // Reject non-admin users
    }

    return false; // Allow admin users
}


module.exports = authJwt;
