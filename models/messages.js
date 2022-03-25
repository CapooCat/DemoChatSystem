const mongoose = require('mongoose');
const msgSchema = new mongoose.Schema({
    mess: String,
    from: { type: String, required: true },
    to: { type: String, required: true }
})

const HistoryMsg = mongoose.model('HistoryMsg', msgSchema);
module.exports = HistoryMsg;