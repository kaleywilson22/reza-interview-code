//Upload multiple picture
import { Request } from "express";
import { prisma } from "../../server";

interface MulterRequest extends Request {
  files: {
    gallery?: (Express.Multer.File & { location: string })[];
  };
}
export const uploadPhotosToGallery = async (req: MulterRequest, res: any) => {
  const { profile_id } = res.locals.user;
  const files = req.files;
  const gallery = files.gallery;
  try {
    let added_gallery;
    if (gallery) {
      added_gallery = await prisma.$transaction(
        gallery.map((file) =>
          prisma.photo.create({
            data: {
              url: file.location as string,
              profile: { connect: { id: parseInt(profile_id) } },
            },
          })
        )
      );
      if (!added_gallery) throw Error("can't update gallery");
    }

    return res.status(200).send(
      JSON.stringify({
        photos_added: added_gallery ? added_gallery : undefined,
      })
    );
  } catch (err: any) {
    return res.status(500).send(JSON.stringify({ err: err.message }));
  }
};
