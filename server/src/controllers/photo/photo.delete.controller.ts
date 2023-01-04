import { Request } from "express";
import { prisma } from "../../server";

export const deleteSinglePicture = async (req: Request, res: any) => {
  const { profile_id } = res.locals.user;
  const { photo_id } = req.body;
  //add functionality to delete array of photo ID's

  if (!photo_id) return res.status(400).send(JSON.stringify({ err: req.body }));

  try {
    const deleted_photos = await prisma.photo.deleteMany({
      where: {
        id: photo_id,
        profile_id: profile_id,
      },
    });

    if (!deleted_photos) throw Error("Could not delete photo");

    res.status(200).send(JSON.stringify({ deleted: deleted_photos }));
  } catch (err: any) {
    return res.status(404).send(JSON.stringify({ err: err.message }));
  }
};
