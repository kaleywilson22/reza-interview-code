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

const CSV_PATH = "/Users/krebsbach/Desktop/no_apply_clean.csv";

const DO_UPDATE = true;

type t = {
  name: string;
  email: string;
  phone: string;
};

function sortFn(a: t, b: t) {
  if (a.phone > b.phone) {
    return -1;
  }
  if (a.phone > b.phone) {
    return 1;
  }
  return 0;
}

csv()
  .fromFile(CSV_PATH)
  .then(async (json) => {
    const reactivates = json as t[];
    const re = reactivates.sort(sortFn);

    const asyncFilter = async (arr: t[], predicate: any) => {
      const results = await Promise.all(arr.map(predicate));

      return arr.filter((_v, index) => results[index]);
    };

    const filtered = await asyncFilter(re, async (r: t, _index: number) => {
      const user = await prisma.user.findUnique({
        where: {
          email: r.email.toLowerCase().trim(),
        },
      });
      if (!user) {
        return true;
      } else {
        console.log(`User ${user.email} already in database`);
        return false;
      }
    });
    console.log(filtered.length);

    const start = new Date();
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 3);

    if (DO_UPDATE) {
      const trans = await prisma.$transaction(
        filtered.map((json, _index) => {
          const email = json.email.toLowerCase().trim();
          const phone = json.phone == "" ? undefined : json.phone;

          return prisma.user.create({
            data: {
              email: email,
              phone: phone,
              full_name: json.name,
              user_category: "DROP_FOREVER",
              profile: {
                create: { display_name: json.name },
              },
              reservation: {
                create: {
                  start_time: start,
                  end_time: tomorrow,
                },
              },
              user_email: {
                create: {
                  email: email,
                  type: { connect: { type: "PRIMARY" } },
                },
              },
              user_phone: {
                ...(phone
                  ? {
                      create: {
                        phone: phone,
                        type: { connect: { type: "PRIMARY" } },
                      },
                    }
                  : {}),
              },
            },
          });
        })
      );
      const messages = trans.map((user, _i) => {
        let portal_link;
        try {
          const token = makeToken(user?.id!);
          portal_link = true
            ? `https://rezafootwear.com/portal?token=${token}`
            : `http://localhost:3000/portal?token=${token}`;
        } catch (e) {
          console.log(e);
        }
        console.log(`Email to: ${user.email}`);
        return {
          To: [{ Email: user.email!, Name: user.full_name }],
          Variables: {
            name: user.full_name,
            portal_link: portal_link || "https://rezafootwear.com/portal",
          },
        };
      });

      const chunkSize = 49;
      let p_mail: any[] = [];
      for (let i = 0, y = 0; i < messages.length; i += chunkSize, y++) {
        const chunk = messages.slice(i, i + chunkSize);
        p_mail[y] = createPromiseFactory(async () => {
          await sendMassEmailMailjet(
            chunk,
            template_ids.correct,
            false,
            "CORRECT_PORTLAL"
          );
        }, 200);
      }
      executeSequentially(p_mail);

      const has_phone = trans.filter((user, _index) => {
        return user.phone !== undefined;
      });

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
            "APPLICATION_ACCEPTANCE",
            short_url || "https://rezafootwear.com/portal"
          );
        }, 20);
      });
      executeSequentially(p_sms);

      console.log(trans[0]);
      console.log(trans.length);
    }
    console.log("finished");
  });
