import { WASocket } from "@whiskeysockets/baileys";
import { logger } from "../../utils/logger";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

interface Session extends WASocket {
  id?: number;
}

const CheckContactNumber = async (
  number: string,
  companyId: number
): Promise<string> => {
  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
    const wbot = getWbot(defaultWhatsapp.id) as Session;

    const results = await wbot.onWhatsApp(`${number}@s.whatsapp.net`);
    
    if (!results || results.length === 0 || !results[0].exists) {
      throw new AppError("invalidNumber");
    }

    return results[0].jid;
  } catch (err) {
    logger.error(`Error checking contact number: ${err}`);
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckContactNumber;
