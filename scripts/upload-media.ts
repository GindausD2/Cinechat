import "dotenv/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream, statSync } from "node:fs";
import { objectStorageClient } from "../src/lib/object-storage";
import { db } from "../src/lib/db";
import { sourceAllowed } from "../src/lib/media";
const { bucket, client } = objectStorageClient();
const base = process.env.MEDIA_CDN_BASE_URL;
if (!base || !base.startsWith("https://")) throw new Error("Set an HTTPS MEDIA_CDN_BASE_URL before uploading.");
const source = await db.mediaSource.findUniqueOrThrow({ where: { id: "big-buck-bunny-open" } });
const key = "open-films/big-buck-bunny.mp4";
const url = `${base.replace(/\/$/, "")}/${key}`;
if (!sourceAllowed({ ...source, url, validFrom: new Date(0), validUntil: null, regions: [] }, "US")) throw new Error("The CDN hostname must be explicitly allowed in MEDIA_ALLOWED_HOSTS.");
const file = ".data/media/big-buck-bunny.mp4";
try {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: createReadStream(file), ContentType: "video/mp4", ContentLength: statSync(file).size, Metadata: { license: "CC-BY-3.0", attribution: "Blender-Foundation-2008-bigbuckbunny.org" } }));
  await db.mediaSource.update({ where: { id: source.id }, data: { url } });
  console.log("Licensed Big Buck Bunny media uploaded and its delivery source updated.");
} finally { await db.$disconnect(); client.destroy(); }
