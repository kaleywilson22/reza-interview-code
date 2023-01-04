import multer from "multer";
import S3 from "aws-sdk/clients/s3";
import multerS3 from "multer-s3";

const s3 = new S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
});

export const imageFilter = (_req: Request, file: any, cb: any) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb("Please upload only images.", false);
  }
};

export const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "./uploads");
  },
  filename: function (_req, file, cb) {
    cb(null, file.originalname);
  },
});
//export const upload = multer({ storage: storage });

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "rezaphotos",
    metadata: function (_req, file, cb) {
      if (file) {
        cb(null, { fieldName: file.originalname });
      }
    },
    key: function (_req, file, cb) {
      if (file) {
        cb(null, file.originalname);
      }
    },
  }),
});
