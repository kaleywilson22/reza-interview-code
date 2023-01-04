import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import { sendMassEmailMailjet, template_ids } from "../../src/utils";

import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";

dotenv.config({ path: __dirname + "/../.env" });
const prisma = new PrismaClient();

const SEND_MAIL = true;

async function main() {
  const users = await prisma.user.findMany({
    where: {
      // user_category: "DROP_C",
      // reservation: {
      //   some: {
      //     completed_reservation: false,
      //   },
      // },
      email: { in: ["jack@rezafootwear.com", "mustafa@rezafootwear.com"] },
    },
  });
  if (SEND_MAIL) {
    const messages = users.map((user, _i) => {
      return {
        To: [{ Email: user.email!, Name: user?.full_name }],
        Variables: {},
      };
    });

    const chunkSize = 1;
    let p: any[] = [];
    for (
      let i = 0, y = 0;
      i < messages.length - chunkSize;
      i += chunkSize, y++
    ) {
      const chunk = messages.slice(i, i + chunkSize);
      p[y] = createPromiseFactory(async () => {
        console.log(`Batch ${i}`);
        await sendMassEmailMailjet(
          chunk,
          template_ids.did_not_apply,
          false,
          "DROP_C_FIRST_REMINDER"
        );
      }, 200);
    }
    executeSequentially(p);
  }
}

main();
