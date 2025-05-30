import { Request, Response } from "express";
import express from "express";
import * as Yup from "yup";
import Gerencianet from "gn-api-sdk-typescript";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Invoices from "../models/Invoices";
import Subscriptions from "../models/Subscriptions";
import Settings from "../models/Setting"; // Adiciona a importação do modelo Settings
import { getIO } from "../libs/socket";
import UpdateUserService from "../services/UserServices/UpdateUserService";

const app = express();

const getGerencianetOptions = async () => {
  const settings = await Settings.findAll({
    attributes: ["key", "value"],
  });

  const settingsMap: { [key: string]: string } = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as { [key: string]: string });

  const options = {
    client_id: settingsMap.gerencianet_client_id || "",
    client_secret: settingsMap.gerencianet_client_secret || "",
    pix_cert: settingsMap.gerencianet_pix_cert_path || "",
    pix_key: settingsMap.gerencianet_pix_key || "",
    sandbox: false, // Modo produção
  };

  if (!options.client_id || !options.client_secret || !options.pix_key || !options.pix_cert) {
    throw new AppError("Credenciais da Gerencianet incompletas", 400);
  }

  return options;
};


export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const options = await getGerencianetOptions();
    const gerencianet = Gerencianet(options);
    return res.json(gerencianet.getSubscriptions());
  } catch (error) {
    console.error("Erro ao listar assinaturas:", error);
    return res.status(500).json({ error: error.message || "Erro ao listar assinaturas" });
  }
};

export const createSubscription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    price: Yup.string().required(),
    users: Yup.string().required(),
    connections: Yup.string().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const {
    firstName,
    price,
    users,
    connections,
    address2,
    city,
    state,
    zipcode,
    country,
    plan,
    invoiceId
  } = req.body;

  try {
    const options = await getGerencianetOptions();
    const gerencianet = Gerencianet(options);

    const body = {
      calendario: {
        expiracao: 3600
      },
      valor: {
        original: price.toLocaleString("pt-br", { minimumFractionDigits: 2 }).replace(",", ".")
      },
      chave: options.pix_key, // Usa a chave Pix da tabela Settings
      solicitacaoPagador: `#Fatura:${invoiceId}`
    };

    const pix = await gerencianet.pixCreateImmediateCharge(null, body);

    const qrcode = await gerencianet.pixGenerateQRCode({
      id: pix.loc.id
    });

    const updateCompany = await Company.findOne();

    if (!updateCompany) {
      throw new AppError("Company not found", 404);
    }

    return res.json({
      ...pix,
      qrcode,
    });
  } catch (error) {
    console.error("Erro ao criar cobrança Pix:", error);
    throw new AppError(error.message || "Erro ao criar cobrança Pix", 400);
  }
};

export const createWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    chave: Yup.string().required(),
    url: Yup.string().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { chave, url } = req.body;

  const body = {
    webhookUrl: url
  };

  const params = {
    chave
  };

  try {
    const options = await getGerencianetOptions();
    const gerencianet = Gerencianet(options);
    const create = await gerencianet.pixConfigWebhook(params, body);
    return res.json(create);
  } catch (error) {
    console.error("Erro ao configurar webhook:", error);
    throw new AppError(error.message || "Erro ao configurar webhook", 400);
  }
};

export const webhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { type } = req.params;
  const { evento } = req.body;
  if (evento === "teste_webhook") {
    return res.json({ ok: true });
  }
  if (req.body.pix) {
    try {
      const options = await getGerencianetOptions();
      const gerencianet = Gerencianet(options);
      for (const pix of req.body.pix) {
        const detahe = await gerencianet.pixDetailCharge({
          txid: pix.txid
        });

        if (detahe.status === "CONCLUIDA") {
          const { solicitacaoPagador } = detahe;
          const invoiceID = solicitacaoPagador.replace("#Fatura:", "");
          const invoices = await Invoices.findByPk(invoiceID);
          const companyId = invoices.companyId;
          const company = await Company.findByPk(companyId);

          const expiresAt = new Date(company.dueDate);
          expiresAt.setDate(expiresAt.getDate() + 30);
          const date = expiresAt.toISOString().split("T")[0];

          if (company) {
            await company.update({
              dueDate: date
            });
            const invoi = await invoices.update({
              id: invoiceID,
              status: 'paid'
            });
            await company.reload();
            const io = getIO();
            const companyUpdate = await Company.findOne({
              where: {
                id: companyId
              }
            });

            io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-payment`, {
              action: detahe.status,
              company: companyUpdate
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao processar webhook:", error);
    }
  }

  return res.json({ ok: true });
};


export const checkWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const options = await getGerencianetOptions();
    const gerencianet = Gerencianet(options);

    const response = await gerencianet.pixDetailWebhook({
      chave: options.pix_key
    });

    return res.json({
      webhookRegistrado: true,
      dados: response
    });
  } catch (error) {
    console.error("Erro ao verificar webhook:", error);
    return res.status(500).json({
      webhookRegistrado: false,
      erro: error.message
    });
  }
};