import multer from "multer";
import path from "path";

const certsFolder = path.resolve(__dirname, "..", "..", "certs");
export default {
  directory: certsFolder,
  storage: multer.diskStorage({
    destination: certsFolder,
    filename: (req, file, cb) => {
      cb(null, file.originalname); // Mantém o nome original do arquivo
    },
  }),
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".p12") {
      return cb(new Error("Apenas arquivos .p12 são permitidos"));
    }
    cb(null, true);
  },
};