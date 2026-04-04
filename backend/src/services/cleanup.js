const cron = require("node-cron");
const File = require("../models/File");
const s3 = require("./s3");

cron.schedule("*/1 * * * *", async () => {
  console.log("Running cleanup job...");

  try {
    const expiredFiles = await File.find({
      expiresAt: { $lt: new Date() },
    });

    console.log("Expired files found:", expiredFiles.length);

    for (let file of expiredFiles) {
      for (const f of file.files) {
        if (!f.s3Key) continue;

        console.log("Deleting from S3:", f.s3Key);

        try {
          await s3.deleteObject({
            Bucket: process.env.S3_BUCKET,
            Key: f.s3Key,
          }).promise();

          console.log("Deleted successfully:", f.s3Key);
        } catch (err) {
          console.error("Delete failed:", f.s3Key, err);
        }
      }

      await File.findByIdAndDelete(file._id);
      console.log("Deleted DB record:", file._id);
    }

    console.log(`Cleanup finished`);

  } catch (err) {
    console.error("Cleanup error:", err);
  }
});
