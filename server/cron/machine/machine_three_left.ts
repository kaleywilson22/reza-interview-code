import "../../src/utils/date";
import { roundToNearestMinute } from "../../src/utils/date";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

import {
  create_shortlink,
  makeToken,
  sendMailjetEmail,
  sendMassEmailMailjet,
  sendSmsFromTemplate,
  template_ids,
} from "../../src/utils";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";

dotenv.config({ path: __dirname + "/../.env" });
const prisma = new PrismaClient();

async function main() {
  console.log(`Executed at ${new Date()}`);
  let buffer_below = roundToNearestMinute(new Date().addHours(3));
  buffer_below.subtractMinutes(5);
  let buffer_above = roundToNearestMinute(new Date().addHours(3));

  const users = await prisma.user.findMany({
    where: {
      user_category: "DROP_FOREVER",
      reservation: {
        some: {
          completed_reservation: false,
          end_time: {
            gte: buffer_below,
            lt: buffer_above,
          },
        },
      },
    },
  });
  console.log(`Number of Users: ${users.length}`);
  const messages = users.map((user, _i) => {
    let portal_link;
    try {
      const token = makeToken(user?.id!);
      portal_link = true
        ? `https://rezafootwear.com/portal?token=${token}`
        : `http://localhost:3000/portal?token=${token}`;
    } catch (e) {
      console.log(e);
    }
    return {
      To: [{ Email: user.email!, Name: user.full_name }],
      Variables: {
        name: user.full_name,
        portal_link: portal_link || "https://rezafootwear.com/portal",
      },
    };
  });
  console.log(`Number of Emails: ${messages.length}`);
  const chunkSize = 49;
  let p_mail: any[] = [];
  for (let i = 0, y = 0; i < messages.length; i += chunkSize, y++) {
    const chunk = messages.slice(i, i + chunkSize);
    p_mail[y] = createPromiseFactory(async () => {
      await sendMassEmailMailjet(
        chunk,
        template_ids.machine_three_hours,
        true,
        "MACHINE_THREE"
      );
    }, 200);
  }
  executeSequentially(p_mail);

  const has_phone = users.filter((user, _index) => {
    return user.phone !== undefined;
  });

  console.log(`Number of Phone: ${has_phone.length}\n`);

  const p_sms = has_phone.map((user, _i) => {
    return createPromiseFactory(async () => {
      if (!user.phone) return;
      let token;
      try {
        if (user.id) {
          await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              drop_live_sms: {
                increment: 1,
              },
            },
          });
        }
      } catch (e) {
        console.log(`Error updating ${user.email}`);
      }

      try {
        token = makeToken(user?.id!);
      } catch (e) {
        console.log("invalid token");
      }

      let short_url;
      try {
        const portal_link: string = true
          ? `https://rezafootwear.com/portal?token=${token}`
          : `http://localhost:3000/portal?token=${token}`;

        const phone_short_link = await create_shortlink(portal_link);
        short_url = phone_short_link.shortURL;
      } catch (e) {
        console.log(e);
        console.log(`Could not make shortIO url ${user.email}`);
      }
      return sendSmsFromTemplate(
        user.phone!,
        "MACHINE_THREE",
        short_url || "https://rezafootwear.com/portal"
      );
    }, 20);
  });
  executeSequentially(p_sms);
}

async function mainWrapper() {
  try {
    main();
  } catch (e) {
    await sendMailjetEmail(
      "jack@rezafootwear.com",
      template_ids.machine_update,
      {
        process: "Machine Three",
        number_emails: "Error occured",
        number_phones: e || "",
      }
    );
  }
}
mainWrapper();
