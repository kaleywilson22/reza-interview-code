import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

import { sendApplicationReminder } from "../src/utils/reminder.functions";
import { template_ids } from "../src/utils";

const sms_short_description = "SECOND_REMINDER";
const mail_template = template_ids.second_application_reminder;

sendApplicationReminder({
  reminder_options: {
    applied: false,
    days_since_last_update: 2,
    reminder_count: 1,
  },
  sms_short_description,
  mail_template,
});
