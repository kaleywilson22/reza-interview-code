import { Request } from "express";
import { prisma } from "../../server";

interface MulterRequest extends Request {
  files: {
    profile?: (Express.Multer.File & { location: string })[];
    gallery?: (Express.Multer.File & { location: string })[];
  };
}

export const updateProfile = async (req: MulterRequest, res: any) => {
  const { id: user_id, profile_id } = res.locals.user;
  const { lyop, description, short_description, city, display_name } = req.body;
  const files = req.files;
  const profile_picture = files.profile ? files.profile[0].location : null;

  try {
    //Update the strings in profile
    const profile = await prisma.profile.update({
      where: {
        user_id: user_id,
      },
      data: {
        lyop,
        description,
        display_name,
        short_description,
        city,
        profile_picture: profile_picture || undefined,
      },
    });

    if (!profile) throw Error("can not update profile");

    //update the profile picture if present
    let added_profile;
    if (profile_picture) {
      const updated_picture = prisma.photo.upsert({
        where: {
          id_is_profile: {
            id: profile_id,
            is_profile: true,
          },
        },
        update: { url: profile_picture },
        create: {
          url: profile_picture,
          is_profile: true,
          profile: { connect: { id: parseInt(profile_id) } },
        },
      });
      if (!updated_picture) throw Error("can't update profile picture");
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
