import * as Sentry from "@sentry/node";
import { proto, WAMessageStubType as WAMessageStubTypeEnum } from "@whiskeysockets/baileys";

// Usar o tipo correto para o enum
export const getReactionMessage = (msg: proto.IWebMessageInfo): string => {
  const reaction = msg?.message?.reactionMessage?.text || "";
  return reaction;
};

// Outras funções de utilidade para processamento de mensagens
export const getMessageType = (msg: proto.IWebMessageInfo): string => {
  const messageType = Object.keys(msg.message || {})[0];
  return messageType;
};

export const getMessageContent = (msg: proto.IWebMessageInfo): any => {
  const messageType = getMessageType(msg);
  return messageType ? msg.message[messageType] : null;
};

export const getMessageId = (msg: proto.IWebMessageInfo): string => {
  return msg.key.id;
};

export const getMessageSender = (msg: proto.IWebMessageInfo): string => {
  return msg.key.remoteJid || "";
};

export const isGroupMessage = (msg: proto.IWebMessageInfo): boolean => {
  return (msg.key.remoteJid || "").endsWith("@g.us");
};

export const wbotGetMessageFromType = {
  getReactionMessage,
  getMessageType,
  getMessageContent,
  getMessageId,
  getMessageSender,
  isGroupMessage
};

export default wbotGetMessageFromType;
