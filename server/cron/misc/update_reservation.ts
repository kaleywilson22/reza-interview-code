import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "jack@rezafootwear.com",
    },
  });
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const updated_reservation = await prisma.reservation.upsert({
    where: {
      user_id: user?.id,
    },
    create: {
      start_time: today,
      end_time: today,
    },
    update: {
      start_time: today,
      end_time: today,
    },
  });

  console.log(updated_reservation);
}

main();
