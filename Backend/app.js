const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');
require('dotenv').config();


app.use(cors());
app.options('*', cors());

// MiddleWare
app.use(bodyParser.json());
app.use(morgan('tiny')); // used to log api requests to the console
app.use(authJwt()); // used to authenticate the user
app.use(errorHandler);
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));



const api = process.env.API_URL;

//Routes
const categoriesRoutes = require('./routers/categories');
const productsRoutes = require('./routers/products');
const usersRoutes = require('./routers/users');
const ordersRoutes = require('./routers/orders');

app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/orders`, ordersRoutes);

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