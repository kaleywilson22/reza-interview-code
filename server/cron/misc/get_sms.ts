import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { PrismaClient } from "@prisma/client";
import { UsOrCanda } from "../../src/utils";

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

  const has_phone = users.filter((user, _i) => {
    return user.phone !== undefined;
  });

  const local = has_phone.filter((user, _i) => {
    return UsOrCanda(user?.phone || "");
  });

  local.map((user) => {
    console.log(user.phone);
  });
}

main();
