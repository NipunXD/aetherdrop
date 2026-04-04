const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  files: [
    {
      filename: String,
      s3Key: String,
    }
  ],
  expiresAt: Date,
  maxDownloads: Number,
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("File", fileSchema);
