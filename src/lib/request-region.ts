import { headers } from "next/headers";
import { regionForRequest } from "./security";
export async function requestRegion() { return regionForRequest(await headers()); }
