import { proto } from "@whiskeysockets/baileys";
import Ticket from "../../models/Ticket";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  isForwarded?: boolean;
  originalMessage?: string;
}

const SendMessageService = async ({
  media,
  ticket,
  body,
  isForwarded = false,
  originalMessage
}: Request): Promise<proto.IWebMessageInfo> => {
  if (media) {
    const messageRecord = await SendWhatsAppMedia({
      media,
      ticket,
      body,
      isForwarded,
      originalMessage
    });
    return messageRecord;
  }
  
  throw new Error("Media is required");
};

export default SendMessageService; 