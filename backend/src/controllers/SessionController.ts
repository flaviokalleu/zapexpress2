import { Request, Response } from "express";
import axios from "axios"; // MODIFICAÇÃO 1: Importação do axios para validar o reCAPTCHA
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import FindUserFromToken from "../services/AuthServices/FindUserFromToken";
import User from "../models/User";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password, recaptchaToken } = req.body; // MODIFICAÇÃO 2: Adicionar recaptchaToken ao destructuring

  // MODIFICAÇÃO 3: Verificar se o recaptchaToken foi enviado
  if (!recaptchaToken) {
    throw new AppError("ERR_RECAPTCHA_TOKEN_MISSING", 400);
  }

  // MODIFICAÇÃO 4: Configurar a Secret Key e a URL de validação do Google reCAPTCHA
  /*const SECRET_KEY = "6Lf1ZBQrAAAAABh1QS-vVPJp12dMv5FM1XaKHn6h";*/

  const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
  const verificationURL = "https://www.google.com/recaptcha/api/siteverify";

  try {

    console.log("Validando reCAPTCHA com Google..."); // LOG 2: Antes da requisição

    // MODIFICAÇÃO 5: Validar o recaptchaToken com o Google
    const recaptchaResponse = await axios.post(verificationURL, null, {
      params: {
        secret: SECRET_KEY,
        response: recaptchaToken,
      },
    });

    const { success, hostname } = recaptchaResponse.data;

    console.log("Resposta do Google reCAPTCHA:", recaptchaResponse.data); // LOG 3: Resposta completa do Google

    // MODIFICAÇÃO 6: Verificar se a validação do reCAPTCHA foi bem-sucedida
    if (!success) {

      console.log("reCAPTCHA inválido:", { success, hostname }); // LOG 4: Falha na validação
      throw new AppError("ERR_RECAPTCHA_VALIDATION_FAILED", 400);
    }

    
    

    // Opcional: Verificar o hostname (domínio) retornado pelo reCAPTCHA
    const expectedHostname = process.env.APP_HOSTNAME;// || "comercial.idemaisag.com.br"; // Use uma variável de ambiente ou domínio fixo

    console.log("Verificando hostname:", { expected: expectedHostname, received: hostname }); // LOG 5: Comparação de hostname

    if (hostname !== expectedHostname) {
      throw new AppError("ERR_RECAPTCHA_INVALID_HOSTNAME", 400);
    }

    console.log("reCAPTCHA válido, autenticando usuário..."); // LOG 6: Sucesso no reCAPTCHA

    // MODIFICAÇÃO 7: Prosseguir com a autenticação se o reCAPTCHA for válido
    const { token, serializedUser, refreshToken } = await AuthUserService({
      email,
      password,
    });

    SendRefreshToken(res, refreshToken);

    const io = getIO();
    io.to(`user-${serializedUser.id}`).emit(`company-${serializedUser.companyId}-auth`, {
      action: "update",
      user: {
        id: serializedUser.id,
        email: serializedUser.email,
        companyId: serializedUser.companyId,
      },
    });

    console.log("Login bem-sucedido:", { userId: serializedUser.id }); // LOG 7: Sucesso no login

    return res.status(200).json({
      token,
      user: serializedUser,
    });
  } catch (error) {

    console.error("Erro no login:", error.message); // LOG 8: Qualquer erro
    // MODIFICAÇÃO 8: Tratar erros do reCAPTCHA e da autenticação
    if (error instanceof AppError) {
      throw error; // Reutiliza o erro personalizado
    }
    console.error("Erro ao validar reCAPTCHA ou autenticar:", error);
    throw new AppError("ERR_INTERNAL_SERVER_ERROR", 500);
  }
};

// Outras funções permanecem iguais
export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const token: string = req.cookies.jrt;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken } = await RefreshTokenService(
    res,
    token
  );

  SendRefreshToken(res, refreshToken);

  return res.json({ token: newToken, user });
};

export const me = async (req: Request, res: Response): Promise<Response> => {
  const token: string = req.cookies.jrt;
  const user = await FindUserFromToken(token);
  const { id, profile, super: superAdmin } = user;

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  return res.json({ id, profile, super: superAdmin });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.user;
  const user = await User.findByPk(id);
  await user.update({ online: false });

  res.clearCookie("jrt");

  return res.send();
};