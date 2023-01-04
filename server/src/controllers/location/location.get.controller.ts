import { profile, user_location } from "@prisma/client";
import { Request, Response } from "express";
import { prisma } from "../../server";

export const getLocation = async (_req: Request, res: Response) => {
  const { id } = res.locals.user;
  try {
    const location = await prisma.user_location.findMany({
      orderBy: {
        created_at: "desc",
      },
      where: {
        user: id,
      },
    });

    if (!location) throw Error("Can not find user's nft");
    return res.status(200).send(JSON.stringify(location));
  } catch (err) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};

export const getAllLocation = async (_req: Request, res: any) => {
  try {
    const location = await prisma.$transaction([
      prisma.user_location.findMany({
        where: { NOT: [{ latitude: 0 }] },
      }),
    ]);

    if (!location)
      throw Error("cannot get gallery (prisma should throw error anyways)");

    res.status(200).send(
      JSON.stringify({
        ...location,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};

export const getAllLocationProfile = async (_req: Request, res: any) => {
  try {
    const location = await prisma.$transaction([
      prisma.user_location.findMany({
        where: { NOT: [{ latitude: 0 }] },
      }),
    ]);

    if (!location)
      throw Error("cannot get gallery (prisma should throw error anyways)");
    let profiles: { location: user_location; profile: profile }[] = [];

    async function getProfiles() {
      await Promise.all(
        location[0].map(async (element) => {
          const profile = await prisma.$transaction([
            prisma.profile.findUnique({
              where: {
                user_id: element.user as number,
              },
            }),
          ]);
          if (profile[0] != null)
            profiles.push({ location: element, profile: profile[0] });
        })
      );
      console.log("finished", profiles);
      return profiles;
    }

    await getProfiles();

    console.log("profiles", profiles);
    res.status(200).send(
      JSON.stringify({
        ...profiles,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
