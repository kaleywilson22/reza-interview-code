import "dotenv/config";
import "isomorphic-fetch";

import { PrismaClient } from "@prisma/client";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";

import { __prod__ } from "./constants";
import {
  auth,
  invite,
  nft,
  profile,
  user,
  version,
  waitlist,
  location,
  webhook,
  reservation,
  order,
} from "./routes";
import { makePhoneAndEmailTypes } from "./utils";

const app = express();

export const prisma = new PrismaClient();

const corsOptions = {
  origin: [
    /\.typeform\.com$/,
    ...(__prod__ ? [] : ["http://localhost:3000"]),
    /\.retool\.com$/,
    /\.rezafootwear\.com$/,
    /\-rezafootwear.vercel.app$/,
  ],
  credentials: true,
  methods: ["GET", "PUT", "POST", "OPTIONS"],
};

app.use(cors(corsOptions));

//We put the webhook routes before using json parser so that the raw body can be processed.
webhook(app);

app.use(express.json({ limit: "300mb" }));
app.use(express.urlencoded({ limit: "300mb", extended: true }));
app.use("/stripe/hooks", bodyParser.raw({ type: "*/*" }));

app.use(bodyParser.json({ limit: "300mb" }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(express.static(__dirname + "/public"));
app.use("/uploads", express.static(__dirname + "../../../uploads"));

auth(app);
user(app);
profile(app);
reservation(app);
waitlist(app);
invite(app);
version(app);
location(app);
nft(app);
order(app);

//Make the look up tables for phone numbers and email ex PRIMARY, RESET, etc
makePhoneAndEmailTypes(prisma);

console.log(`NODE_ENV="${process.env.NODE_ENV}"`);
console.log(`__prod__ = ${__prod__}`);
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
