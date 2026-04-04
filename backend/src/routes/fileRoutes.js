const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = require("../services/s3");
const File = require("../models/File");
const archiver = require("archiver");

router.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).send("No files uploaded");
    }

    const uploadedFiles = [];

    for (const file of files) {
        const key = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}-${file.originalname}`;

      await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
      }).promise();

      uploadedFiles.push({
        filename: file.originalname,
        s3Key: key,
      });
    }
      
    const { expiryHours, maxDownloads } = req.body;

    const maxDownloadsNum = parseInt(maxDownloads) || 1;
      const expiryHoursNum =
        parseFloat(expiryHours) > 0 ? parseFloat(expiryHours) : 24;
    
  const expiresAt = new Date(
    Date.now() + expiryHoursNum * 60 * 60 * 1000
  );

  const newFile = await File.create({
    files: uploadedFiles,
    expiresAt,
    maxDownloads: maxDownloadsNum,
    downloadCount: 0,
  });

    res.json({
      link: `/api/file/${newFile._id}`,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

router.get("/file/:id", async (req, res) => {
  try {
    const fileDoc = await File.findById(req.params.id);

    if (!fileDoc) return res.status(404).send("Not found");

    if (fileDoc.expiresAt < new Date()) {
      return res.status(403).send("File expired");
    }

    if (fileDoc.downloadCount + 1 > fileDoc.maxDownloads) {
      console.log("Download blocked");
      return res.status(403).send("Download limit reached");
    }

    console.log(
      `Download ${fileDoc.downloadCount + 1}/${fileDoc.maxDownloads}`
    );

    await File.findByIdAndUpdate(
      fileDoc._id,
      { $inc: { downloadCount: 1 } }
    );

    res.attachment("aetherdrop-files.zip");

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.pipe(res);

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).end();
    });

    for (const f of fileDoc.files) {
      const stream = s3
        .getObject({
          Bucket: process.env.S3_BUCKET,
          Key: f.s3Key,
        })
        .createReadStream();

      archive.append(stream, { name: f.filename });
    }

    await archive.finalize();

  } catch (err) {
    console.error(err);
    res.status(500).send("Error downloading files");
  }
});

module.exports = router;
