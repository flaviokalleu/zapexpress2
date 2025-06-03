import { Request, Response } from "express";
import authConfig from "../config/auth";
import * as Yup from "yup";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import { head } from "lodash";
import fs from "fs";
import path from "path";
import User from "../models/User";
import Company from "../models/Company";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ShowSettingsService from "../services/SettingServices/ShowSettingsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  //if (req.user.profile !== "admin") {
    //throw new AppError("ERR_NO_PERMISSION", 403);
  //}

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};


/*export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {

  //const { companyId } = req.user;
  const companyId = 1;
  const { settingKey } = req.params;
  

  const retornoData = await ShowSettingsService({ settingKey, companyId });

  return res.status(200).json(retornoData);
};*/


export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey } = req.params;
  const companyId = 1;

  const retornoData = await ShowSettingsService({ settingKey, companyId });

  // Retorna valor padrão para system_title se não encontrado
  if (settingKey === "system_title" && !retornoData) {
    return res.status(200).json({ key: "system_title", value: "IDE+ COMERCIAL", companyId });
  }

  return res.status(200).json(retornoData);
};

/* NOVA FUNÇÃO PARA FAZER O UPLOAD DAS LOGOMARCAS DO SISTEMA E BANNER */

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const userId = req.user.id;
  const ref = req.query.ref as string;

  // Verificar permissões
  const requestUser = await User.findByPk(userId);
  if (requestUser.super === false) {
    throw new AppError("Você não tem permissão para esta ação!", 403);
  }
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  if (companyId !== 1) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Verificar se o arquivo foi enviado
  const files = req.files as Express.Multer.File[];
  const file = files[0];
  if (!file) {
    throw new AppError("Nenhum arquivo enviado!", 400);
  }

  // Validar tipo de arquivo
  const allowedExtensions = ref === "favicon" ? [".png", ".ico"] : [".png"];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    throw new AppError(`Apenas arquivos ${allowedExtensions.join(" ou ")} são permitidos!`, 400);
  }

  // Mapear ref para nomes de arquivos
  const fileNameMap: { [key: string]: string[] } = {
    banner: ["tela-login.png"],
    logo_menu_interno: ["logo_menu.png"],
    logo_menu_interno_dark: ["logo_menu_dark.png"],
    logo_interno: [
      "interno.png",
      "signup.png",
      "lofo_w.png",
      "android-chrome-192x192.png",
      "android-chrome-512x512.png",
      "apple-touch-icon.png",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "favicon-256x256.png",
      "mstile-150x150.png",
      "login.png",
      "logo.png",
      "logo_w.png"
    ],
    logo_favicon: ["favicon.ico", "favicon.png"]
  };

  if (!fileNameMap[ref]) {
    throw new AppError("Referência inválida!", 400);
  }

  // Diretórios de destino (dinâmicos)
  const projectRoot = path.resolve(__dirname, "../../.."); // Volta até /home/usuário/nomesistema
  const directories = [
    path.join(projectRoot, "backend/public/logotipos"),
    path.join(projectRoot, "frontend/public"),
    path.join(projectRoot, "frontend/build")
  ];

  // Caminho do arquivo salvo pelo multer
  const sourcePath = file.path;
  console.log("Source Path:", sourcePath);
  console.log("Directories:", directories);

  try {
    // Verificar se o arquivo de origem existe
    if (!fs.existsSync(sourcePath)) {
      throw new AppError("Arquivo de origem não encontrado!", 500);
    }

    // Para cada nome de arquivo associado ao ref
    for (const fileName of fileNameMap[ref]) {
      // Copiar o arquivo para cada diretório
      for (const dir of directories) {
        // Verificar se o diretório existe, criar se necessário
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const destPath = path.join(dir, fileName);
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Remover o arquivo temporário do multer
    fs.unlinkSync(sourcePath);

    return res.status(200).json({ mensagem: "Arquivo Anexado" });
  } catch (error) {
    console.error(error);
    throw new AppError("Erro ao processar o upload!", 500);
  }
};

export const certUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { body } = req.body;
  const { companyId } = req.user;

  const userId = req.user.id;
  const requestUser = await User.findByPk(userId);

  if (requestUser.super === false) {
    throw new AppError("você nao tem permissão para esta ação!");
  }

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (companyId !== 1) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const files = req.files as Express.Multer.File[];
  const file = head(files);
  console.log(file);
  return res.send({ mensagem: "Arquivo Anexado" });
};



export const docUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { body } = req.body;
  const { companyId } = req.user;

  const userId = req.user.id;
  const requestUser = await User.findByPk(userId);

  if (requestUser.super === false) {
    throw new AppError("você nao tem permissão para esta ação!");
  }

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (companyId !== 1) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const files = req.files as Express.Multer.File[];
  const file = head(files);
  console.log(file);
  return res.send({ mensagem: "Arquivo Anexado" });
};