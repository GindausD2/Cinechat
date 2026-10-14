import { S3Client } from "@aws-sdk/client-s3";
import { AppError } from "./security";
export function objectStorageClient() {
  const { OBJECT_STORAGE_BUCKET: bucket, OBJECT_STORAGE_REGION: region, OBJECT_STORAGE_ACCESS_KEY_ID: accessKeyId, OBJECT_STORAGE_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) throw new AppError(503, "Object storage credentials are not configured.");
  return { bucket, client: new S3Client({ region, endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.OBJECT_STORAGE_ENDPOINT), credentials: { accessKeyId, secretAccessKey } }) };
}
