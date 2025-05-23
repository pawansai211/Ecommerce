const {Product} = require('../models/product');
const express = require('express');
const { Category } = require('../models/category');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');



// mime type
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if(isValid) {
            uploadError = null
        }
      cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        
      const fileName = file.originalname.split(' ').join('-');
      const extension = FILE_TYPE_MAP[file.mimetype];
      cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
  })
  
const uploadOptions = multer({ storage: storage })

// get the list of products plus the category
router.get(`/`, async (req, res) =>{
    let filter = {};
    if(req.query.categories) // filtering by category
    {
         filter = {category: req.query.categories.split(',')}
    }

    const productList = await Product.find(filter).populate('category');

    if(!productList) {
        res.status(500).json({success: false})
    } 
    res.send(productList);
})

// get products by ID plus the category 
router.get(`/:id`, async (req, res) =>{
    const product = await Product.findById(req.params.id).populate('category');

    if(!product) {
        res.status(500).json({success: false})
    } 
    res.send(product);
})

// uploading products
router.post(`/`, uploadOptions.single('image'), async (req, res) => {
    
    try {
        const category = await Category.findById(req.body.category);
        if (!category) {
            console.log('Invalid Category');
            return res.status(400).send('Invalid Category');
        }
        
        const file = req.file;
        if (!file) {
            console.log('No image in the request');
            return res.status(400).send('No image in the request');
        }
        
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;        
        
        let embedding = [];
        let product = new Product({
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: `${basePath}${fileName}`,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
            embedding: Array(1536).fill(0)
        });
        
        
        product = await product.save();
        console.log('Product saved');
        
        if (!product) {
            console.log('Product cannot be created');
            return res.status(500).send('The product cannot be created');
        }
        
        console.log('Product created successfully');
        res.send(product);
    } catch (error) {
        console.error('Error in creating product:', error);
        res.status(500).send('An internal server error occurred');
    }
});


// updating product information
router.put('/:id',async (req, res)=> {
    if(!mongoose.isValidObjectId(req.params.id)) { // validate object id
       return res.status(400).send('Invalid Product Id')
    }
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: req.body.image,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        },
        { new: true} // makes sure the updated data is returned
    )

    if(!product)
    return res.status(500).send('the product cannot be updated!')

    res.send(product);
})

// deleting a product
router.delete('/:id', (req, res)=>{
    Product.findByIdAndDelete(req.params.id).then(product =>{
        if(product) {
            return res.status(200).json({success: true, message: 'the product is deleted!'})
        } else {
            return res.status(404).json({success: false , message: "product not found!"})
        }
    }).catch(err=>{
       return res.status(500).json({success: false, error: err}) 
    })
})

// returns the number of products for admins only
router.get(`/get/count`, async (req, res) => {
    try {
        const productCount = await Product.countDocuments();  // No callback needed

        if (!productCount) {
            return res.status(500).json({ success: false });
        }

        res.send({
            productCount: productCount
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// get featured products to be displayed on the home page
router.get(`/get/featured/:count`, async (req, res) =>{
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({isFeatured: true}).limit(+count);

    if(!products) {
        res.status(500).json({success: false})
    } 
    res.send(products);
})

// uploading multiple images for admins
router.put(
    '/gallery-images/:id', 
    uploadOptions.array('images', 10), 
    async (req, res)=> {
        if(!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id')
         }
         const files = req.files
         let imagesPaths = [];
         const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

         if(files) {
            files.map(file =>{
                imagesPaths.push(`${basePath}${file.filename}`);
            })
         }

         const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths
            },
            { new: true}
        )

        if(!product)
            return res.status(500).send('the gallery cannot be updated!')

        res.send(product);
    }
)

module.exports =router;
