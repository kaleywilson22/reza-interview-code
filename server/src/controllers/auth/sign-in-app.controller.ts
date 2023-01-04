import { prisma } from "../../server";
import { Request } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/auth.config";
import { StreamChat } from "stream-chat";

export const signInApp = async (req: Request, res: any) => {
  const user = res.locals.user;
  const code_to_check = req.body.activation_code;
  const serverClient = StreamChat.getInstance(
    "txbemy92ft3p",
    "9upawnyegudsk5cjqfgv2hxg3n3hy9pf3y4gzqedjda3c9s2qg69zwdx9ujmyck2"
  );

  try {
    const code = await prisma.code.findUnique({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "EMAIL_LOGIN",
        },
      },
    });

    if (!code) {
      return res.status(400).send({ message: "code not found" });
    }

    //Code is valid for 2 hours
    const time_is_valid =
      new Date().getTime() <
      new Date(code.updated_at).getTime() + 2 * 60 * 60 * 1000;
    const code_matches = parseInt(code.code) === parseInt(code_to_check);

    if (!time_is_valid || !code_matches) {
      return res.status(400).send({ message: "code expired or invalid" });
    }

    const profile = await prisma.profile.findUnique({
      where: {
        user_id: user.id,
      },
    });

    if (!profile) return res.status(400).send({ message: "profile not found" });
    const stream_token = serverClient.createToken(profile.id.toString());
    const access_token = jwt.sign(
      { id: user.id, profile_id: profile.id },
      config.access_secret as string,
      {
        expiresIn: 60 * 60, // 1 hour
      }
    );

    const refresh_token = jwt.sign(
      { id: user.id, profile_id: profile.id },
      config.refresh_secret as string,
      {
        expiresIn: 86400 * 7 * 3, // 3 months
      }
    );

    //first save the refresh token in the database
    const updated_token = await prisma.token.create({
      data: {
        token: refresh_token,
      },
    });

    //first save the refresh token in the database
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        last_login_at: new Date(),
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
    console.log(err.message);
    return res.status(500).send({ message: err.message });
  }
};
