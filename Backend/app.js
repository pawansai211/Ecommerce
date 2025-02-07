const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

app.use(cors());
app.options('*', cors());

// MiddleWare
app.use(bodyParser.json());
app.use(morgan('tiny')); // used to log api requests to the console
app.use(authJwt()); // used to authenticate the user
app.use(errorHandler);


require('dotenv/config');

const api = process.env.API_URL;

//Routes
const categoriesRoutes = require('./routers/categories');
const productsRoutes = require('./routers/products');
const usersRoutes = require('./routers/users');

app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);

mongoose.connect(process.env.CONNECTION_STRING)
.then(() => {
    console.log('Database Connection is Ready...')
})
.catch((err) => {
    console.log(err);
});

app.listen(3000, ()=> {
    console.log(api)
    console.log("Server is Running at http://localhost:3000");
});