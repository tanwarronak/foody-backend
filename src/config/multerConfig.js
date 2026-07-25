import multer from 'multer';

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {

    if (file.mimetype.startsWith("image/")) {
        return cb(null, true);
    }

    cb(new Error("Only image files are allowed."));
};

export const upload = multer({ storage: storage, fileFilter: imageFilter });