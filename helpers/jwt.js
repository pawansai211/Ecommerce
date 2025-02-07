const { expressjwt } = require('express-jwt');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;

    // Now using expressjwt as a middleware
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

    // Return the middleware function
    return jwtMiddleware;
}

async function isRevoked(req, payload, done) {
    if (!payload.isAdmin) {
        // Reject access if the user is not an admin
        return done(null, true);
    }

    // Allow access if user is admin
    done();
}

module.exports = authJwt;
