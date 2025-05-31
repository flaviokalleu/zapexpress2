import * as Sentry from "@sentry/node";
import { writeFile } from "fs";
import { head, isNil, isEmpty } from "lodash";
import path, { join } from "path";
import { promisify } from "util";
import QRCode from "qrcode";
import { map_msg } from "../../utils/global";

import {
  downloadMediaMessage,
  extractMessageContent,
  getContentType,
  jidNormalizedUser,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  delay,
  WASocket,
  DisconnectReason
} from "@whiskeysockets/baileys";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { Mutex } from "async-mutex";

import {
  AudioConfig,
  SpeechConfig,
  SpeechSynthesizer
} from "microsoft-cognitiveservices-speech-sdk";
import moment from "moment";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { Op } from "sequelize";
import { debounce } from "../../helpers/Debounce";
import formatBody from "../../helpers/Mustache";
import ffmpeg from "fluent-ffmpeg";
import { cacheLayer } from "../../libs/cache";
import { getIO } from "../../libs/socket";
import { Store } from "../../libs/store";
import MarkDeleteWhatsAppMessage from "./MarkDeleteWhatsAppMessage";
import Campaign from "../../models/Campaign";
import * as MessageUtils from "./wbotGetMessageFromType";
import CampaignShipping from "../../models/CampaignShipping";
import Queue from "../../models/Queue";
import QueueIntegrations from "../../models/QueueIntegrations";
import QueueOption from "../../models/QueueOption";
import Setting from "../../models/Setting";
import TicketTraking from "../../models/TicketTraking";
import User from "../../models/User";
import UserRating from "../../models/UserRating";
import { campaignQueue, parseToMilliseconds, randomValue } from "../../queues";
import { logger } from "../../utils/logger";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import typebotListener from "../TypebotServices/typebotListener";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { provider } from "./providers";
import { SimpleObjectCache } from "../../helpers/simpleObjectCache";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { getMessageOptions } from "./SendWhatsAppMedia";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

import ffmpegPath from 'ffmpeg-static';
ffmpeg.setFfmpegPath(ffmpegPath);

const request = require("request");

const fs = require('fs')

type Session = WASocket & {
  id?: number;
  store?: Store;
};

interface SessionOpenAi extends OpenAIApi {
  id?: number;
}

const sessionsOpenAi: SessionOpenAi[] = [];

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

interface IMe {
  name: string;
  id: string;
}

interface IMessage {
  messages: WAMessage[];
  isLatest: boolean;
}

interface MessageData {
  id: string;
  ticketId: number;
  contactId?: number;
  body: string;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  quotedMsgId?: string;
  timestamp?: number;
  status?: string;
}

export const isNumeric = (value: string) => /^-?\d+$/.test(value);

const writeFileAsync = promisify(writeFile);

const wbotMutex = new Mutex();

const groupContactCache = new SimpleObjectCache(1000 * 30, logger);

const multVecardGet = function (param: any) {
  let output = " "

  let name = param.split("\n")[2].replace(";;;", "\n").replace('N:', "").replace(";", "").replace(";", " ").replace(";;", " ").replace("\n", "")
  let inicio = param.split("\n")[4].indexOf('=')
  let fim = param.split("\n")[4].indexOf(':')
  let contact = param.split("\n")[4].substring(inicio + 1, fim).replace(";", "")
  let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "")

  if (contact != "item1.TEL") {
    output = output + name + ": 📞" + contact + "" + "\n"
  } else
    output = output + name + ": 📞" + contactSemWhats + "" + "\n"
  return output
}

const contactsArrayMessageGet = (msg: any,) => {
  let contactsArray = msg.message?.contactsArrayMessage?.contacts
  let vcardMulti = contactsArray.map(function (item, indice) {
    return item.vcard;
  });

  let bodymessage = ``
  vcardMulti.forEach(function (vcard, indice) {
    bodymessage += vcard + "\n\n" + ""
  })

  let contacts = bodymessage.split("BEGIN:")

  contacts.shift()
  let finalContacts = ""
  for (let contact of contacts) {
    finalContacts = finalContacts + multVecardGet(contact)
  }

  return finalContacts
}

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  return getContentType(msg.message);
};

export function validaCpfCnpj(val) {
  if (val.length == 11) {
    var cpf = val.trim();

    cpf = cpf.replace(/\./g, '');
    cpf = cpf.replace('-', '');
    cpf = cpf.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cpf.length > i; i++) {
      if (cpf[i - 1] != cpf[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
      v1 += cpf[i] * p;
    }

    v1 = ((v1 * 10) % 11);

    if (v1 == 10) {
      v1 = 0;
    }

    if (v1 != cpf[9]) {
      return false;
    }

    for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
      v2 += cpf[i] * p;
    }

    v2 = ((v2 * 10) % 11);

    if (v2 == 10) {
      v2 = 0;
    }

    if (v2 != cpf[10]) {
      return false;
    } else {
      return true;
    }
  } else if (val.length == 14) {
    var cnpj = val.trim();

    cnpj = cnpj.replace(/\./g, '');
    cnpj = cnpj.replace('-', '');
    cnpj = cnpj.replace('/', '');
    cnpj = cnpj.split('');

    var v1 = 0;
    var v2 = 0;
    var aux = false;

    for (var i = 1; cnpj.length > i; i++) {
      if (cnpj[i - 1] != cnpj[i]) {
        aux = true;
      }
    }

    if (aux == false) {
      return false;
    }

    for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v1 += cnpj[i] * p1;
      } else {
        v1 += cnpj[i] * p2;
      }
    }

    v1 = (v1 % 11);

    if (v1 < 2) {
      v1 = 0;
    } else {
      v1 = (11 - v1);
    }

    if (v1 != cnpj[12]) {
      return false;
    }

    for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
      if (p1 >= 2) {
        v2 += cnpj[i] * p1;
      } else {
        v2 += cnpj[i] * p2;
      }
    }

    v2 = (v2 % 11);

    if (v2 < 2) {
      v2 = 0;
    } else {
      v2 = (11 - v2);
    }

    if (v2 != cnpj[13]) {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(time) {
  await timeout(time);
}
export const sendMessageImage = async (
  wbot: Session,
  contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        image: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
        fileName: caption,
        caption: caption,
        mimetype: 'image/jpeg'
      }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      {
        text: formatBody('Não consegui enviar o PDF, tente novamente!', contact)
      }
    );
  }
  verifyMessage(sentMessage, ticket, contact, ticket.companyId); // Pass companyId
};

export const sendMessageLink = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  url: string,
  caption: string
) => {

  let sentMessage
  try {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
      document: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
      fileName: caption,
      caption: caption,
      mimetype: 'application/pdf'
    }
    );
  } catch (error) {
    sentMessage = await wbot.sendMessage(
      `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
      text: formatBody('Não consegui enviar o PDF, tente novamente!', contact)
    }
    );
  }
  verifyMessage(sentMessage, ticket, contact, ticket.companyId); // Pass companyId
};

export function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


const getBodyButton = (msg: proto.IWebMessageInfo): string => {
  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText}*`;

    for (const buton of msg.message?.viewOnceMessage?.message?.buttonsMessage?.buttons) {
      bodyMessage += `\n\n${buton.buttonText?.displayText}`;
    }
    return bodyMessage;
  }

  if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
    let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.listMessage?.description}*`;
    for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
      for (const rows of buton.rows) {
        bodyMessage += `\n\n${rows.title}`;
      }
    }

    return bodyMessage;
  }
};

const msgLocation = (image, latitude, longitude) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");

    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};


export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    let type = getTypeMessage(msg);

    // Novo: Adicionar log para depurar o tipo de mensagem recebido
    logger.info(`getBodyMessage: Tipo de mensagem detectado: ${type}, ID: ${msg.key.id}, remoteJid: ${msg.key.remoteJid}`);

    const types = {
      conversation: msg?.message?.conversation,
      editedMessage: msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation,
      imageMessage: msg.message?.imageMessage?.caption || "Imagem",
      videoMessage: msg.message?.videoMessage?.caption || "Vídeo",
      extendedTextMessage: msg.message?.extendedTextMessage?.text,
      buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedButtonId,
      templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo: msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.title,
      buttonsMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      viewOnceMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      stickerMessage: "Sticker",
      reactionMessage: MessageUtils.getReactionMessage(msg) || "reaction",
      contactMessage: msg.message?.contactMessage?.vcard,
      contactsArrayMessage: (msg.message?.contactsArrayMessage?.contacts) && contactsArrayMessageGet(msg),
      locationMessage: msgLocation(
        msg.message?.locationMessage?.jpegThumbnail,
        msg.message?.locationMessage?.degreesLatitude,
        msg.message?.locationMessage?.degreesLongitude
      ),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message?.documentMessage?.fileName,
      documentWithCaptionMessage: msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
      audioMessage: "Áudio", // Já presente no código original
      listMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      listResponseMessage: msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      ephemeralMessage: msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      imageWhitCaptionMessage: msg?.message?.ephemeralMessage?.message?.imageMessage,
    };

    const objKey = Object.keys(types).find(key => key === type);

    if (!objKey) {
      // Novo: Adicionar log para quando o tipo não for encontrado
      logger.warn(`getBodyMessage: Tipo de mensagem não encontrado: ${type}, mensagem: ${JSON.stringify(msg)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
      Sentry.captureException(
        new Error("Novo Tipo de Mensagem em getTypeMessage")
      );
      return "Mensagem desconhecida no momento.";
    }

    // Novo: Adicionar log para confirmar o valor retornado
    logger.info(`getBodyMessage: Retornando body: ${types[type] || "Mensagem desconhecida no momento"} para mensagem ID: ${msg.key.id}`);
    return types[type] || "Mensagem desconhecida no momento.";
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
    Sentry.captureException(error);
    console.log(error);
    return "Mensagem desconhecida no momento.";
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo): any => {
  const body =
    msg.message.imageMessage?.contextInfo ||
    msg.message.videoMessage?.contextInfo ||
    msg.message?.documentMessage ||
    msg.message.extendedTextMessage?.contextInfo ||
    msg.message.buttonsResponseMessage?.contextInfo ||
    msg.message.listResponseMessage?.contextInfo ||
    msg.message.templateButtonReplyMessage?.contextInfo ||
    msg.message.buttonsResponseMessage?.contextInfo ||
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
    msg.message.listResponseMessage?.contextInfo;
  msg.message.senderKeyDistributionMessage;

  // testar isso
  if (!body) return null; // Add check for null body

  const contextValues = Object.keys(body).values();
  const nextValue = contextValues.next();
  if (nextValue.done) return null; // Add check if iterator is done

  return extractMessageContent(body[nextValue.value]);
};
export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message);
  if (!body) return null; // Add check for null body

  const messageKeys = Object.keys(msg?.message || {});
  if (messageKeys.length === 0) return null; // Add check for empty message

  const firstKey = messageKeys[0];
  const messageContent = body[firstKey];

  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";

  return reaction ? reaction : messageContent?.contextInfo?.stanzaId;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  }
};

const getSenderMessage = (
  msg: proto.IWebMessageInfo,
  wbot: Session
): string => {
  const me = getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  const senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;

  return senderId && jidNormalizedUser(senderId);
};

const getContactMessage = async (msg: proto.IWebMessageInfo, wbot: Session) => {
  const isGroup = msg.key.remoteJid?.includes("g.us");
  const rawNumber = msg.key.remoteJid?.replace(/\D/g, "");
  return isGroup
    ? {
      id: getSenderMessage(msg, wbot),
      name: msg.pushName
    }
    : {
      id: msg.key.remoteJid,
      name: msg.key.fromMe ? rawNumber : msg.pushName
    };
};

const downloadMedia = async (msg: proto.IWebMessageInfo) => {

  let buffer
  try {
    buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {}
    )
  } catch (err) {


    console.error('Erro ao baixar mídia:', err);

    // Trate o erro de acordo com as suas necessidades
  }

  let filename = msg.message?.documentMessage?.fileName || "";

  const mineType =
    msg.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.documentMessage;

  if (!mineType) return { buffer, filename };

  const messageType = mineType.mimetype?.split("/")[0].replace("application", "document") || "document";

  const fileExtension = mineType.mimetype?.split("/")[1].split(";")[0] || "";

  if (!filename) {
    filename = `${messageType}-${new Date().getTime()}.${fileExtension}`;
  }

  return { buffer, filename, mineType };
};

export const verifyContact = async (
  msgContact: IMe,
  wbot: Session,
  companyId: number
) => {
  let profilePicUrl: string;
  try {
    profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
  } catch {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number: msgContact.id.replace(/\D/g, ""),
    profilePicUrl,
    isGroup: msgContact.id.includes("g.us"),
    companyId
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

export const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { id: quoted },
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

export const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  companyId: number // Add companyId parameter
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

  const media = await downloadMedia(msg);

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  if (!media.buffer) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  try {
    const folder = join(__dirname, "..", "..", "..", "public");
    const fileName = `${ticket.id}_${msg.key.id}`;
    const ext = media.filename.split(".").pop();
    const mediaPath = join(folder, `${fileName}.${ext}`);
    await writeFileAsync(mediaPath, media.buffer, "base64");
    const messageData: MessageData = {
      id: msg.key.id,
      ticketId: ticket.id,
      contactId: msg.key.fromMe ? undefined : contact.id,
      body: msg.key.fromMe ? media.filename : getBodyMessage(msg),
      fromMe: msg.key.fromMe,
      read: msg.key.fromMe,
      mediaUrl: `${fileName}.${ext}`,
      mediaType: media.mineType.mimetype.split("/")[0],
      quotedMsgId: quotedMsg?.id,
      timestamp: msg.messageTimestamp as number, // Cast to number
      status: "received"
    };

    await ticket.update({
      lastMessage: messageData.body
    });

    const newMessage = await CreateMessageService({ messageData, companyId }); // Pass companyId

    return newMessage;
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  companyId: number // Add companyId parameter
) => {
  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData: MessageData = {
    id: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body: getBodyMessage(msg),
    fromMe: msg.key.fromMe,
    mediaType: getTypeMessage(msg),
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    timestamp: msg.messageTimestamp as number, // Cast to number
    status: "received"
  };

  await ticket.update({
    lastMessage: messageData.body
  });

  await CreateMessageService({ messageData, companyId }); // Pass companyId
};

export const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) {
      return false;
    }

    const ifType =
      msgType === "conversation" ||
      msgType === "editedMessage" ||
      msgType === "extendedTextMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "viewOnceMessage";

    if (!ifType) {
      logger.warn(`Mensagem ignorada por não ter um tipo válido: ${msgType}`);
      return false;
    }

    return true;
  } catch (error) {
    Sentry.captureException(error);
    logger.error(error);
    return false;
  }
};

export const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number
): Promise<void> => {
  if (!isValidMsg(msg)) {
    return;
  }

  try {
    let msgContact: IMe;
    let groupContact: Contact | undefined;

    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    const msgIsGroupBlock = await Setting.findOne({
      where: {
        companyId,
        key: "CheckMsgIsGroup",
      },
    });

    const bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);

    const hasMedia =
      msg.message?.audioMessage ||
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage ||
      msg.message?.stickerMessage;

    if (msg.key.fromMe) {
      if (/\u200e/.test(bodyMessage)) return;

      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "buttonsResponseMessage" &&
        msgType !== "buttonsMessage" &&
        msgType !== "messageContextInfo" &&
        msgType !== "locationMessage" &&
        msgType !== "listResponseMessage" &&
        msgType !== "listMessage" &&
        msgType !== "reactionMessage"
      )
        return;

      msgContact = await getContactMessage(msg, wbot);
    } else {
      msgContact = await getContactMessage(msg, wbot);
    }

    if (msgIsGroupBlock?.value === "enabled" && isGroup) return;

    if (isGroup) {
      const grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
      const msgGroupContact = {
        id: grupoMeta.id,
        name: grupoMeta.subject
      };
      groupContact = await verifyContact(msgGroupContact, wbot, companyId);
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
    const contact = await verifyContact(msgContact, wbot, companyId);

    let unreadMessages = 0;

    if (msg.key.fromMe) {
      await cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
    } else {
      const unreads = await cacheLayer.get(`contacts:${contact.id}:unreads`);
      unreadMessages = +unreads + 1;
      await cacheLayer.set(
        `contacts:${contact.id}:unreads`,
        `${unreadMessages}`
      );
    }

    const lastMessage = await Message.findOne({
      where: {
        contactId: contact.id,
        companyId: companyId
      },
      order: [["createdAt", "DESC"]]
    });

    // Fix date comparison
    const sixtySecondsAgo = new Date(Date.now() - 60000);
    if (
      !lastMessage ||
      (lastMessage &&
        lastMessage.createdAt < sixtySecondsAgo)
    ) {
      const ticket = await FindOrCreateTicketService(
        contact,
        wbot.id!,
        unreadMessages,
        companyId,
        groupContact
      );

      if (hasMedia) {
        await verifyMediaMessage(msg, ticket, contact, companyId); // Pass companyId
      } else {
        await verifyMessage(msg, ticket, contact, companyId); // Pass companyId
      }

      if (!ticket.queue && !isGroup && !msg.key.fromMe && !ticket.userId) {
        const queue = await Queue.findOne({
          where: {
            companyId,
            standard: true
          }
        });

        if (queue) {
          await UpdateTicketService({
            ticketId: ticket.id,
            ticketData: {
              queueId: queue.id
            },
            companyId
          });
        }
      }

      if (!msg.key.fromMe && !ticket.userId) {
        const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
        const queues = whatsapp.queues;
        const greetingMessage = whatsapp.greetingMessage;

        const selectedOption =
          msg.message?.buttonsResponseMessage?.selectedButtonId ||
          msg.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
          getBodyMessage(msg);

        // Fix queue option access
        const choosenQueue = queues.find(
          queue => queue.options.some(option => option.option === selectedOption)
        );

        if (choosenQueue) {
          await UpdateTicketService({
            ticketData: { queueId: choosenQueue.id },
            ticketId: ticket.id,
            companyId
          });
        }
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export const handleMsgAck = async (
  msg: WAMessageUpdate,
  chat: number | null | undefined
) => {
  const io = getIO();
  try {
    const messageToUpdate = await Message.findByPk(msg.key.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageToUpdate) return;

    await messageToUpdate.update({ ack: chat });
    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export const wbotMessageListener = async (wbot: Session, companyId: number): Promise<void> => {
  try {
    wbot.ev.on("messages.upsert", async (messageUpsert: ImessageUpsert) => {
      const messages = messageUpsert.messages
        .filter(msg => msg.message)
        .map(msg => msg);

      if (!messages) return;

      messages.forEach(async (message: proto.IWebMessageInfo) => {
        if (wbot.type === "md" && !message.key.fromMe) {
          try {
            await wbot.readMessages([message.key]);
          } catch (e) {
            logger.warn(
              `Erro ao tentar marcar mensagem como lida: ${e}`
            );
          }
        }

        handleMessage(message, wbot, companyId);
      });
    });

    wbot.ev.on("messages.update", async (messageUpdate: WAMessageUpdate[]) => {
      messageUpdate.forEach(async (message: WAMessageUpdate) => {
        handleMsgAck(message, message.update.status);
      });
    });

    wbot.ev.on("messages.delete", async (messageDelete: any) => {
      try {
        const io = getIO();
        const messages = await Message.findAll({
          where: {
            id: {
              [Op.in]: messageDelete.keys.map((k: any) => k.id)
            }
          },
          include: [
            "contact",
            {
              model: Message,
              as: "quotedMsg",
              include: ["contact"]
            }
          ]
        });

        messages.forEach((message: Message) => {
          io.to(message.ticketId.toString()).emit("appMessage", {
            action: "delete",
            message
          });
        });

        await Message.destroy({
          where: {
            id: {
              [Op.in]: messageDelete.keys.map((k: any) => k.id)
            }
          }
        });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(err);
      }
    });

    wbot.ev.on("message-receipt.update", (events: any) => {
      events.forEach(async (event: any) => {
        const { id, receipt } = event;
        const status = receipt.receiptTimestamp ? "read" : "received";
        try {
          const messageToUpdate = await Message.findByPk(id, {
            include: [
              "contact",
              {
                model: Message,
                as: "quotedMsg",
                include: ["contact"]
              }
            ]
          });

          if (!messageToUpdate) return;

          await messageToUpdate.update({ status });

          const io = getIO();
          io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
            action: "update",
            message: messageToUpdate
          });
        } catch (err) {
          Sentry.captureException(err);
          logger.error(err);
        }
      });
    });

    wbot.ev.on("groups.update", async (groupUpdates: any) => {
      groupUpdates.forEach(async (groupUpdate: any) => {
        const number = groupUpdate.id.split("@")[0];
        const nameGroup = groupUpdate.subject;

        const contact = await Contact.findOne({
          where: { number, companyId }
        });

        if (contact) {
          await contact.update({ name: nameGroup });
        }
      });
    });

    wbot.ev.on("groups.upsert", async (groupUpsert: any) => {
      groupUpsert.forEach(async (groupUpdate: any) => {
        const number = groupUpdate.id.split("@")[0];
        const nameGroup = groupUpdate.subject;

        const contact = await Contact.findOne({
          where: { number, companyId }
        });

        if (contact) {
          await contact.update({ name: nameGroup });
        }
      });
    });

    wbot.ev.on("group-participants.update", async (events: any) => {
      const io = getIO();
      events.forEach(async (event: any) => {
        const { id, participants, action } = event;
        const number = id.split("@")[0];
        const contact = await Contact.findOne({
          where: { number, companyId }
        });

        if (!contact) return;

        const ticket = await Ticket.findOne({
          where: {
            contactId: contact.id,
            status: { [Op.or]: ["open", "pending"] }
          },
          include: ["contact"]
        });

        if (!ticket) return;

        const messageData = {
          id: String(randomValue(100000, 999999)), // Provide min and max values
          ticketId: ticket.id,
          body: `${action === "add" ? "entrou" : "saiu"} do grupo: ${participants
            .map((participant: any) => {
              const numberParticipant = participant.split("@")[0];
              return numberParticipant;
            })
            .join(", ")}`,
          fromMe: false,
          read: true,
          sendType: "chat"
        };

        await CreateMessageService({
          messageData,
          companyId
        });

        io.to(ticket.id.toString()).emit("appMessage", {
          action: "create",
          message: messageData,
          contact: contact,
          ticket
        });
      });
    });

    wbot.ev.on("call", async (events: any) => {
      const io = getIO();
      events.forEach(async (event: any) => {
        const { peerJid, id, status, isGroup } = event;
        if (status !== "offer") return;
        if (isGroup) return;

        const number = peerJid.split("@")[0];
        const contact = await Contact.findOne({
          where: { number, companyId }
        });

        if (!contact) return;

        const ticket = await Ticket.findOne({
          where: {
            contactId: contact.id,
            status: { [Op.or]: ["open", "pending"] }
          },
          include: ["contact"]
        });

        if (!ticket) return;

        const messageData = {
          id: String(randomValue(100000, 999999)), // Provide min and max values
          ticketId: ticket.id,
          body: "Chamada de voz/vídeo perdida",
          fromMe: false,
          read: true,
          sendType: "chat"
        };

        await CreateMessageService({
          messageData,
          companyId
        });

        io.to(ticket.id.toString()).emit("appMessage", {
          action: "create",
          message: messageData,
          contact: contact,
          ticket
        });
      });
    });

    wbot.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        if (companyId) {
          const sessionIndex = wbot.id || 0;
          try {
            QRCode.toDataURL(qr).then(url => {
              const io = getIO();
              io.emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: sessionIndex,
                qr: url
              });
            });
          } catch (error) {
            Sentry.captureException(error);
            logger.error(error);
          }
        }
      }

      if (connection === "close") {
        const whatsapp = await Whatsapp.findByPk(wbot.id);
        if (whatsapp) {
          if (lastDisconnect?.error?.output?.statusCode === 403) {
            await whatsapp.update({ status: "PENDING", session: "" });
            const io = getIO();
            io.emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: wbot.id,
              qr: ""
            });
            await wbot.logout();
          }

          if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            setTimeout(
              () => {
                StartWhatsAppSession(whatsapp, companyId);
              },
              generateRandomNumber(10000, 20000)
            );
          } else {
            await whatsapp.update({ status: "PENDING", session: "" });
            const io = getIO();
            io.emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: wbot.id,
              qr: ""
            });
            await wbot.logout();
          }
        }
      }

      if (connection === "open") {
        const whatsapp = await Whatsapp.findByPk(wbot.id);
        if (whatsapp) {
          await whatsapp.update({
            status: "CONNECTED",
            qrcode: "",
            retries: 0
          });

          const io = getIO();
          io.emit(`company-${companyId}-whatsappSession`, {
            action: "update",
            session: wbot.id,
            qr: ""
          });

          const sessionIndex = wbot.id || 0;
          io.emit(`company-${companyId}-whatsappSession`, {
            action: "ready",
            session: sessionIndex
          });
        }
      }
    });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const handleRawWebMessageReceived = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number
): Promise<void> => {
  const io = getIO();

  try {
    const type = getTypeMessage(msg);

    if (
      type === "protocolMessage" ||
      type === "senderKeyDistributionMessage"
    ) {
      return;
    }

    const chat = await getContactMessage(msg, wbot);
    const msgContact = await verifyContact(chat, wbot, companyId);
    const ticket = await FindOrCreateTicketService(
      msgContact,
      wbot.id!,
      0,
      companyId
    );

    if (msg.message?.protocolMessage?.type === 0 && msg.key.fromMe) {
      await MarkDeleteWhatsAppMessage(msg.key.id!, ticket, companyId.toString());
    }

    if (msg.message?.protocolMessage?.type === 3 && msg.key.fromMe) {
      await MarkDeleteWhatsAppMessage(
        msg.message.protocolMessage.key?.id!,
        ticket,
        companyId.toString()
      );
    }

    if (
      [
        WAMessageStubType.REVOKE,
        WAMessageStubType.E2E_DEVICE_CHANGED,
        WAMessageStubType.E2E_IDENTITY_CHANGED,
        WAMessageStubType.CIPHERTEXT
      ].includes(msg.messageStubType as number)
    ) {
      return;
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

const checkMsgIsGroup = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid?.endsWith("@g.us")) {
    return true;
  }
  return false;
};

const verifyRecentCampaign = async (
  message: proto.IWebMessageInfo,
  companyId: number
): Promise<boolean> => {
  if (!message.key.fromMe) {
    return false;
  }
  const number = message.key.remoteJid?.replace(/\D/g, "");
  const campaigns = await Campaign.findAll({
    where: {
      companyId,
      status: "EM_ANDAMENTO",
      createdAt: {
        [Op.between]: [+new Date() - 1000 * 60 * 10, +new Date()]
      }
    }
  });
  const campaignShipping = await CampaignShipping.findOne({
    where: {
      number,
      companyId,
      campaignId: {
        [Op.in]: campaigns.map(c => c.id)
      }
    }
  });
  if (!campaignShipping) {
    return false;
  }

  await campaignShipping.update({
    deliveredAt: new Date(),
    delivered: true
  });

  return true;
};

export const handleMessageSentByAPI = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number
): Promise<void> => {
  const io = getIO();

  try {
    const type = getTypeMessage(msg);

    if (
      type === "protocolMessage" ||
      type === "senderKeyDistributionMessage"
    ) {
      return;
    }

    const isCampaign = await verifyRecentCampaign(msg, companyId);

    if (isCampaign) {
      return;
    }

    const isGroup = checkMsgIsGroup(msg);
    let chat = await getContactMessage(msg, wbot);

    let msgContact: Contact;
    if (isGroup) {
      const profilePicUrl = await wbot.profilePictureUrl(
        msg.key.remoteJid
      );

      const contactData = {
        name: msg.key.remoteJid.split("@")[0],
        number: msg.key.remoteJid.split("@")[0],
        isGroup,
        companyId,
        profilePicUrl
      };

      msgContact = await CreateOrUpdateContactService(contactData);
    } else {
      msgContact = await verifyContact(chat, wbot, companyId);
    }

    if (msg.key.fromMe) {
      const ticket = await FindOrCreateTicketService(
        msgContact,
        wbot.id!,
        0,
        companyId
      );

      await verifyMessage(msg, ticket, msgContact, companyId); // Pass companyId

      const apiMessage = await Message.findByPk(msg.key.id, {
        include: [
          "contact",
          {
            model: Message,
            as: "quotedMsg",
            include: ["contact"]
          }
        ]
      });

      if (apiMessage) {
        io.to(ticket.id.toString()).emit("appMessage", {
          action: "create",
          message: apiMessage,
          ticket,
          contact: msgContact
        });
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};

export const handleMessageSent = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number
): Promise<void> => {
  const io = getIO();

  try {
    const type = getTypeMessage(msg);

    if (
      type === "protocolMessage" ||
      type === "senderKeyDistributionMessage"
    ) {
      return;
    }

    const isCampaign = await verifyRecentCampaign(msg, companyId);

    if (isCampaign) {
      return;
    }

    const isGroup = checkMsgIsGroup(msg);
    let chat = await getContactMessage(msg, wbot);

    let msgContact: Contact;
    if (isGroup) {
      const profilePicUrl = await wbot.profilePictureUrl(
        msg.key.remoteJid
      );

      const contactData = {
        name: msg.key.remoteJid.split("@")[0],
        number: msg.key.remoteJid.split("@")[0],
        isGroup,
        companyId,
        profilePicUrl
      };

      msgContact = await CreateOrUpdateContactService(contactData);
    } else {
      msgContact = await verifyContact(chat, wbot, companyId);
    }

    if (msg.key.fromMe) {
      const ticket = await FindOrCreateTicketService(
        msgContact,
        wbot.id!,
        0,
        companyId
      );

      await verifyMessage(msg, ticket, msgContact, companyId); // Pass companyId

      const sentMessage = await Message.findByPk(msg.key.id, {
        include: [
          "contact",
          {
            model: Message,
            as: "quotedMsg",
            include: ["contact"]
          }
        ]
      });

      if (sentMessage) {
        io.to(ticket.id.toString()).emit("appMessage", {
          action: "create",
          message: sentMessage,
          ticket,
          contact: msgContact
        });
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};
