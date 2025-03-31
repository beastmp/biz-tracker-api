const {GetObjectCommand} = require("@aws-sdk/client-s3");
const {getSignedUrl} = require("@aws-sdk/s3-request-presigner");

/**
 * Generate a presigned URL for temporary access to a private S3 object
 * @param {S3Client} client - S3 client instance
 * @param {string} bucket - S3 bucket name
 * @param {string} key - Object key/path
 * @param {number} expiresIn - Expiration time in seconds (default: 3600)
 * @return {Promise<string>} Signed URL
 */
const generatePresignedUrl = async (client, bucket, key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, {expiresIn});
};

/**
 * Build a public S3 URL based on region and bucket
 * @param {string} bucket - S3 bucket name
 * @param {string} region - AWS region
 * @param {string} key - Object key/path
 * @return {string} Public URL
 */
const buildS3Url = (bucket, region, key) => {
  // Clean the key to ensure it doesn't have leading slashes
  const cleanKey = key.startsWith("/") ? key.substring(1) : key;

  // Build the URL - format: https://<bucket>.s3.<region>.amazonaws.com/<key>
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
};

/**
 * Determine the correct content type based on file extension
 * @param {string} fileName - Name of the file
 * @return {string} MIME type
 */
const getContentType = (fileName) => {
  const extension = fileName.split(".").pop().toLowerCase();

  const mimeTypes = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "pdf": "application/pdf",
    "doc": "application/msword",
    // eslint-disable-next-line max-len
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "csv": "text/csv",
    "txt": "text/plain",
    "json": "application/json",
    "zip": "application/zip",
    "mp3": "audio/mpeg",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
  };

  return mimeTypes[extension] || "application/octet-stream";
};

module.exports = {
  generatePresignedUrl,
  buildS3Url,
  getContentType,
};
