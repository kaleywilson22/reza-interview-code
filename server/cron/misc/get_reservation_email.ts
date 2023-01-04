import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      reservation: {
        some: {
          completed_reservation: true,
        },
      },
    },
  });

  users.map((user) => {
    console.log(user.email);
  });
}

main();
