import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { sendApplicationReminder } from "../src/utils/reminder.functions";
import { template_ids } from "../src/utils";

const sms_short_description = "FIRST_REMINDER";
const mail_template = template_ids.application_reminder;

sendApplicationReminder({
  reminder_options: {
    applied: false,
    days_since_last_update: 1,
    reminder_count: 0,
  },
  sms_short_description,
  mail_template,
});
