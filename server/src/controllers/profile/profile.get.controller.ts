import { Request } from "express";

import { prisma } from "../../server";

export const getSingleProfile = async (_req: Request, res: any) => {
  const user = res.locals.user;
  try {
    const [profile, gallery] = await prisma.$transaction([
      prisma.profile.findUnique({
        where: {
          user_id: user.id as number,
        },
      }),
      prisma.photo.findMany({
        take: 15,
        orderBy: {
          created_at: "desc",
        },
        where: {
          is_profile: false,
          profile: {
            user: { id: user.id as number },
          },
        },
      }),
    ]);

    if (!profile || !gallery)
      throw Error("cannot get gallery (prisma should throw error anyways)");

    res.status(200).send(
      JSON.stringify({
        ...profile,
        gallery: gallery.length ? gallery : undefined,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};

export const getAllProfiles = async (_req: Request, res: any) => {
  try {
    const profile = await prisma.$transaction([
      prisma.profile.findMany({
        where: { NOT: [{ short_description: null }] },
      }),
    ]);

    if (!profile)
      throw Error("cannot get gallery (prisma should throw error anyways)");

    res.status(200).send(
      JSON.stringify({
        ...profile,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};

export const getSingleProfileById = async (req: any, res: any) => {
  const id: number = req.params.id;
  try {
    const [profile, gallery] = await prisma.$transaction([
      prisma.profile.findUnique({
        where: {
          id: Number(id),
        },
      }),
      prisma.photo.findMany({
        take: 15,
        orderBy: {
          created_at: "desc",
        },
        where: {
          is_profile: false,
          profile: {
            user: { id: Number(id) },
          },
        },
      }),
    ]);

    if (!profile || !gallery)
      throw Error("cannot get gallery (prisma should throw error anyways)");

    res.status(200).send(
      JSON.stringify({
        ...profile,
        gallery: gallery.length ? gallery : undefined,
      })
    );
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
