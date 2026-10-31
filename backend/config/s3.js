const { S3Client } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');

// One S3 client for the whole server: it keeps its own connection pool and
// credentials, so building one per upload throws that work away each time.
const s3 = new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: fromEnv(),
});

module.exports = s3;
