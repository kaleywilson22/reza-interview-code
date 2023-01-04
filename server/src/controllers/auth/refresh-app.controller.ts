import { prisma } from "../../server";
import { Request } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/auth.config";
import { maliciousActivityTemplate } from "../../templates/malicious.activity.template";
import { sendMail } from "../../utils";
import { __prod__ } from "../../constants";
import { StreamChat } from "stream-chat";

export const refreshApp = async (req: Request, res: any) => {
  const authorizationHeader = req.headers.authorization as string;
  const user = res.locals.user;
  const serverClient = StreamChat.getInstance(
    "txbemy92ft3p",
    "9upawnyegudsk5cjqfgv2hxg3n3hy9pf3y4gzqedjda3c9s2qg69zwdx9ujmyck2"
  );

  if (!authorizationHeader) return res.sendStatus(401);

  const token = authorizationHeader.trim().split(" ")[1];

  try {
    let malicious = false;
    const refresh = await prisma.token.findUnique({
      where: {
        token: token as string,
      },
    });

    if (!refresh) {
      //This should never happen
      // If the refresh token is still valid but isn't in the database then
      //that means someone has stolen an old refresh token and is trying to use it maliciously
      //Send a message to Thibo and Jack so they can check the activity

      const mailOptions = maliciousActivityTemplate(
        ["jack@rezafootwear.com", "thibaut@rezafootwear.com"],
        user.id
      );
      if (__prod__) {
        sendMail(mailOptions, (err: any, _result: any) => {
          if (err) {
            console.log("error");
          }
        });
      }
      malicious = true;
      console.log("Malicious Intent");
    }

    const profile = await prisma.profile.findUnique({
      where: {
        user_id: user.id as number,
      },
    });

    if (!profile) return res.status(400).send({ message: "profile not found" });
    const stream_token = serverClient.createToken(profile.id.toString());
    console.log("test stream tokem", stream_token);

    const access_token = jwt.sign(
      { id: user.id, profile_id: profile.id },
      config.access_secret as string,
      {
        expiresIn: 60 * 60, //1 hr
      }
    );

    const refresh_token = jwt.sign(
      { id: user.id },
      config.refresh_secret as string,
      {
        expiresIn: 86400 * 7 * 3, // 3 months
      }
    );

    //first save the refresh token in the database
    //If it doesn't match it will create a new one, but should always match
    const updated_token = await prisma.token.upsert({
      where: {
        token: token || "",
      },
      update: { token: refresh_token, flag: malicious },
      create: {
        token: refresh_token,
        flag: malicious,
      },
    });

    if (!updated_token) {
      throw Error("can not authorize user");
    }
    res.status(200).send({
      id: user.id,
      access_token: access_token,
      refresh_token: refresh_token,
      stream_token: stream_token,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
};
