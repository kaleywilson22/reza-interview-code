import { Request, Response } from "express";
import {
  create_shortlink,
  makeToken,
  sendMailjetEmail,
  sendSmsFromTemplate,
  template_ids,
} from "../../utils";
import { prisma } from "../../server";
import crypto from "crypto";

export const typeformWebhook = async (request: Request, response: Response) => {
  const signature = request.headers["typeform-signature"];

  const isValid = verifySignature(
    signature,
    `${JSON.stringify(request.body)}\u000a`
  );
  if (!isValid) {
    return response.status(401).json({ error: "unauthorized" });
  }
  const data = request.body;
  const hidden_fields = data.form_response.hidden;
  const applied_at = data.form_response.submitted_at;
  const res = data.form_response.answers;

  const name = res.filter(getField("name"))[0]?.text;

  let updated_email;
  try {
    updated_email = res.filter(getField("email"))[0]?.email;
  } catch (e) {}

  const email = hidden_fields?.current_email || updated_email;

  const phone =
    hidden_fields?.current_phone ||
    res.filter(getField("sms"))[0]?.phone_number;

  const lyop = res.filter(getField("lyop"))[0]?.text;
  const city = res.filter(getField("city"))[0]?.text;

  const shoe_size = res.filter(getField("shoe_size"))[0]?.choice.label;

  await prisma.waitlist.upsert({
    where: {
      email: email.toLowerCase().trim(),
    },
    update: {
      name: name || undefined,
      lyop: lyop || undefined,
      phone: phone || undefined,
      applied_at: applied_at || undefined,
      city: city || undefined,
      applied: true,
      shoe_size: shoe_size,
      accepted: true,
      accepted_at: new Date(),
    },
    create: {
      email: email.toLowerCase().trim(),
      name: name || undefined,
      lyop: lyop || undefined,
      phone: phone || undefined,
      applied_at: applied_at || undefined,
      city: city || undefined,
      applied: true,
      shoe_size: shoe_size,
      accepted: true,
      accepted_at: new Date(),
    },
  });

  const nu = await prisma.user.upsert({
    where: {
      email: email.toLowerCase().trim(),
    },
    update: {
      email: email.toLowerCase().trim(),
      user_category: "DROP_FOREVER",
      full_name: name || undefined,
      phone: phone || undefined,
      profile: {
        update: {
          lyop: lyop || undefined,
          city: city || undefined,
        },
      },
      user_phone: {
        updateMany: {
          where: {
            phone_type_id: 1,
          },
          data: {
            phone: phone,
          },
        },
      },
    },
    create: {
      user_category: "DROP_FOREVER",
      email: email.toLowerCase().trim(),
      full_name: name || undefined,
      phone: phone || undefined,
      profile: {
        create: {
          lyop: lyop || undefined,
          city: city || undefined,
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

  const today = new Date();
  const end_t = new Date(today);
  end_t.setDate(end_t.getDate() + 3);

  await prisma.reservation.upsert({
    where: {
      user_id: null?.id,
    },
    create: {
      user: {
        connect: { id: nu?.id },
      },
      start_time: today,
      end_time: end_t,
    },
    update: {
      start_time: today,
      end_time: end_t,
    },
  });

  let portal_link;
  try {
    const token = makeToken(nu?.id!);
    portal_link = true
      ? `https://rezafootwear.com/portal?token=${token}`
      : `http://localhost:3000/portal?token=${token}`;
  } catch (e) {
    console.log(e);
  }

  await sendMailjetEmail(
    nu.email,
    template_ids.machine_acceptance,
    {
      name: nu.full_name || "",
      portal_link: portal_link || "https://rezafootwear.com/portal",
    },
    false,
    "MACHINE_ACCEPTANCE_V2"
  );
  let short_url;

  let token;
  try {
    token = makeToken(nu?.id!);
  } catch (e) {
    console.log("invalid token");
  }

  try {
    const portal_link: string = true
      ? `https://rezafootwear.com/portal?token=${token}`
      : `http://localhost:3000/portal?token=${token}`;

    const phone_short_link = await create_shortlink(portal_link);
    short_url = phone_short_link.shortURL;
  } catch (e) {
    console.log(e);
    console.log(`Could not make shortIO url ${nu.email}`);
  }

  await sendSmsFromTemplate(
    nu.phone!,
    "APPLICATION_ACCEPTANCE",
    short_url || "https://rezafootwear.com/portal"
  );

  return response.status(200).send();
};

const verifySignature = (receivedSignature: any, payload: any) => {
  const hash = crypto
    // .createHmac("sha256", process.env.TYPEFORM_SECRET)
    .createHmac("sha256", "xxxxxxxxxxxxxxxxxxxxxxxxxxxx")
    .update(payload)
    .digest("base64");
  return receivedSignature === `sha256=${hash}`;
};

function getField(field: string) {
  return function (element: { field: { ref: string } }) {
    return element.field.ref === field;
  };
}
