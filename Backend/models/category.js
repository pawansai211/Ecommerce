const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
    },
    color: { 
        type: String,
    }
})


categorySchema.virtual('id').get(function () {
    return this._id.toHexString(); // convert the object id to string
});

categorySchema.set('toJSON', {
    virtuals: true, // enable virtuals for frontend
});

exports.Category = mongoose.model('Category', categorySchema);