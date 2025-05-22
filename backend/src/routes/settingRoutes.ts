import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as SettingController from "../controllers/SettingController";
import multer from "multer";
import uploadConfig from "../config/uploadlogo";
import uploadCertConfigEfiGerencianet from "../config/uploadcertEfiGerencianet";


import axios from "axios"; // Para chamadas HTTP à API da Efí


const upload = multer(uploadConfig);
const uploadCert = multer(uploadCertConfigEfiGerencianet); // Nova linha

const settingRoutes = Router();

settingRoutes.get("/settings", isAuth, SettingController.index);

settingRoutes.get("/settings/:settingKey", SettingController.show);

settingRoutes.put("/settings/:settingKey", isAuth, SettingController.update);

settingRoutes.post(
  "/settings/media-upload",
  isAuth,
  upload.array("file"),
  SettingController.mediaUpload
);

settingRoutes.post(
  "/settings/upload-gerencianet-cert",
  isAuth,
  uploadCert.single("certFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const filePath = `${req.file.originalname}`;
      const absoluteFilePath = `${uploadCertConfigEfiGerencianet.directory}/${filePath}`;
      const certName = req.file.originalname.replace(/\.p12$/, "");
      const companyId = req.user.companyId;

      const { Settings } = req.app.get("models");
      await Settings.upsert({
        key: "gerencianet_pix_cert_path",
        value: absoluteFilePath,
        companyId: companyId,
      });
      await Settings.upsert({
        key: "gerencianet_pix_cert",
        value: certName,
        companyId: companyId,
      });

      return res.status(200).json({ mensagem: "Arquivo Anexado" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao processar o upload" });
    }
  }
);



// Rota para registrar o webhook da Efí Gerencianet
settingRoutes.post(
  "/efi/register-webhook",
  isAuth,
  async (req, res) => {
    try {
      const { Settings } = req.app.get("models");
      const companyId = req.user.companyId;

      // Busca as credenciais da Efí na tabela Settings
      const clientId = await Settings.findOne({ where: { key: "gerencianet_client_id", companyId } });
      const clientSecret = await Settings.findOne({ where: { key: "gerencianet_client_secret", companyId } });
      const pixKey = await Settings.findOne({ where: { key: "gerencianet_pix_key", companyId } });

      // Verifica se as credenciais existem
      if (!clientId?.value || !clientSecret?.value || !pixKey?.value) {
        return res.status(400).json({ message: "Credenciais da Efí Gerencianet não configuradas." });
      }

      // Monta a URL dinâmica do webhook
      const webhookUrl = `${process.env.BACKEND_URL}/subscription/webhook`;

      // Faz a requisição para registrar o webhook na Efí
      const response = await axios.post(
        `${process.env.BACKEND_URL}/subscription/create/webhook`,
        {
          chave: pixKey.value,
          url: webhookUrl,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Verifica a resposta da Efí
      if (response.status === 200 || response.data.success) {
        return res.status(200).json({ status: 200, message: "Webhook registrado com sucesso." });
      } else {
        return res.status(500).json({ message: "Falha ao registrar webhook na Efí." });
      }
    } catch (error) {
      console.error("Erro ao registrar webhook:", error);
      return res.status(500).json({ message: `Erro ao registrar webhook: ${error.message}` });
    }
  }
);

export default settingRoutes;