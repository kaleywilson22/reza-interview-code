import { Request } from "express";
import { prisma } from "../../server";

interface MulterRequest extends Request {
  files: {
    profile?: (Express.Multer.File & { location: string })[];
  };
}

export const createProfile = async (req: MulterRequest, res: any) => {
  const { user_id, lyop, description, short_description, city } = req.body;
  const files = req.files;
  const profile_picture = files.profile ? files.profile[0].location : undefined;

  try {
    const profile = await prisma.profile.create({
      data: {
        user: { connect: { id: parseInt(user_id) } },
        lyop,
        description,
        short_description,
        city,
        profile_picture: profile_picture,
      },
    });

    if (!profile) throw Error("can not create profile");

    let added_profile;
    if (profile_picture) {
      added_profile = await prisma.profile.update({
        where: { user_id: parseInt(user_id) },
        data: {
          profile_picture: profile_picture as string,
          photos: {
            create: {
              url: profile_picture as string,
              is_profile: true,
            },
          },
        },
      });
      if (!added_profile) throw Error("can't update profile picture");
    }

    return res.status(200).send(
      JSON.stringify({
        ...(added_profile ? added_profile : profile),
      })
    );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
