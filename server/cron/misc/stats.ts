import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: __dirname + "/../.env" });
const prisma = new PrismaClient();

async function main() {}

main();
