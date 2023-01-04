import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import "../../src/utils/date";
import { roundToNearestMinute } from "../../src/utils/date";
import {
  sendMassEmailMailjet,
  sendSmsFromTemplate,
  template_ids,
} from "../../src/utils";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";

import "../../src/utils/date";

dotenv.config({ path: __dirname + "/../.env" });
const prisma = new PrismaClient();

async function main() {
  console.log(`Executed at ${new Date()}`);
  let buffer_below = roundToNearestMinute(new Date().subtractHours(1));
  buffer_below.subtractMinutes(5);
  let buffer_above = roundToNearestMinute(new Date().subtractHours(1));

  const users = await prisma.user.findMany({
    where: {
      user_category: "DROP_FOREVER",
      reservation: {
        some: {
          completed_reservation: false,
          reactivated: false,
          end_time: {
            gte: buffer_below,
            lt: buffer_above,
          },
        },
      },
    },
  });

  const messages = users.map((user, _i) => {
    return {
      To: [{ Email: user.email!, Name: user.full_name }],
      Variables: {},
    };
  });

  const chunkSize = 49;
  let p_mail: any[] = [];
  for (let i = 0, y = 0; i < messages.length; i += chunkSize, y++) {
    const chunk = messages.slice(i, i + chunkSize);
    p_mail[y] = createPromiseFactory(async () => {
      await sendMassEmailMailjet(
        chunk,
        template_ids.machine_closed,
        false,
        "MACHINE_CLOSED"
      );
    }, 200);
  }
  executeSequentially(p_mail);

  const has_phone = users.filter((user, _index) => {
    return user.phone !== undefined;
  });

  const p_sms = has_phone.map((user, _i) => {
    return createPromiseFactory(async () => {
      if (!user.phone) return;
      return sendSmsFromTemplate(user.phone!, "MACHINE_CLOSED");
    }, 20);
  });
  executeSequentially(p_sms);
}

main();
