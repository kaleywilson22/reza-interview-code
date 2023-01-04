import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });
import { PrismaClient } from "@prisma/client";
import csv from "csvtojson";
import {
  create_shortlink,
  makeToken,
  sendMassEmailMailjet,
  sendSmsFromTemplate,
  template_ids,
} from "../../src/utils";
import {
  createPromiseFactory,
  executeSequentially,
} from "../../src/utils/promises";
import { __prod__ } from "../../src/constants";

const prisma = new PrismaClient();

const CSV_PATH = "/Users/krebsbach/Desktop/reactivate_clean.csv";

const DO_UPDATE = true;

type t = {
  name: string;
  email: string;
  phone: string;
};

csv()
  .fromFile(CSV_PATH)
  .then(async (json) => {
    const reactivates = json as t[];
    const emails = reactivates.map((r) => r.email.toLowerCase().trim());
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: emails,
        },
      },
    });
    console.log(users.length);
    console.log(emails.length);
    const ids = users.map((u) => u.id);
    const start = new Date();
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 3);
    if (DO_UPDATE) {
      await prisma.reservation.updateMany({
        where: {
          user_id: { in: ids },
          reactivated: false,
        },
        data: {
          reactivated: true,
          reactivated_at: new Date(),
          start_time: start,
          end_time: tomorrow,
        },
      });

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
            template_ids.machine_reactivate,
            false,
            "MACHINE_REACTIVATE"
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
            "MACHINE_REACTIVATE",
            short_url || "https://rezafootwear.com/portal"
          );
        }, 20);
      });
      executeSequentially(p_sms);
    }
  });
