import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const accountSid = process.env.TWILLIO_SID;
const authToken = process.env.TWILLIO_TOKEN;

export const twillio_client = require("twilio")(accountSid, authToken);

export const UsOrCanda = (number: string | undefined) => {
  if (number == undefined || number == "") return false;
  const re = /^(\+?1 ?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return re.test(number);
};

export const sendSms = async (
  phone: string,
  body: string,
  image?: string,
  link?: string
) => {
  const send_image = UsOrCanda(phone);
  try {
    await twillio_client.messages.create({
      body: `${body}\n${link ? link : ""}`,
      messagingServiceSid: "MG200c51d80e6ed6c34aaafb0465f8d966",
      mediaUrl: send_image ? [image] : undefined,
      to: phone,
    });
  } catch (e) {
    console.log(e);
  }
};

export type templates_in_db =
  | "AFTER_WAITLIST"
  | "FIRST_REMINDER"
  | "SECOND_REMINDER"
  | "APPLICATION_UPDATE"
  | "APPLICATION_ACCEPTANCE"
  | "DROP_UPDATE"
  | "DROP_BEFORE_LIVE"
  | "DROP_LIVE"
  | "DROP_REMINDER_ONE"
  | "DROP_REMINDER_TWO"
  | "DROP_REMINDER_THREE"
  | "MACHINE_TWENTY_FOUR"
  | "MACHINE_THREE"
  | "MACHINE_CLOSED"
  | "MACHINE_REACTIVATE";

export const sendSmsFromTemplate = async (
  phone: string,
  sms_short_description: templates_in_db, //sms short description comes from the DB
  link?: string, // This will superseed any links stored in the template in the DB
  intro?: string
) => {
  const send_image = UsOrCanda(phone);
  try {
    const sms_content = await prisma.message_content.findUnique({
      where: {
        short_description: sms_short_description,
      },
    });
    const media_url = send_image ? sms_content?.img_url : undefined;

    await twillio_client.messages.create({
      body: `${intro ? intro : ""}${sms_content?.message}\n${
        link || sms_content?.link || ""
      }`,
      messagingServiceSid: "MG200c51d80e6ed6c34aaafb0465f8d966",
      ...(media_url !== null ? { mediaUrl: [media_url] } : {}),
      to: phone,
    });
  } catch (e) {
    console.log(e);
    console.log(`Unable to send text to ${phone}`);
  }
};
