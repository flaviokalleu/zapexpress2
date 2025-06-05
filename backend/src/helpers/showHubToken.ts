import Setting from "../models/Setting";
import { logger } from "../utils/logger";

export const showHubToken = async (companyId: number): Promise<string | any> => {
  try {
    const notificameHubToken = await Setting.findOne({
      where: {
        key: "hubToken",
        companyId: companyId
      }
    });

    if (!notificameHubToken) {
      logger.warn(`Token do Notificame Hub não encontrado para a empresa ${companyId}`);
      return null;
    }

    return notificameHubToken.value;
  } catch (err) {
    logger.error(`Erro ao buscar token do Notificame Hub: ${err.message}`);
    return null;
  }
};