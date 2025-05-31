import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import * as Sentry from "@sentry/node";
import { WASocket } from "@whiskeysockets/baileys";

// Interface para compatibilidade com a tipagem esperada
interface Session extends WASocket {
  id?: number;
}

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.emit(`company-${companyId}-whatsappSession`, {
    action: "update",
    session: whatsapp
  });

  try {
    // Usando unknown como intermediário para evitar erros de tipagem
    const wbotRaw = await initWASocket(whatsapp);
    const wbot = wbotRaw as unknown as Session;

    wbotMessageListener(wbot as any, companyId);
    await wbotMonitor(wbot as any, whatsapp, companyId);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};
