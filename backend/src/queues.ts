import * as Sentry from "@sentry/node";
import { Worker, Queue, Job, QueueOptions, WorkerOptions } from "bullmq";
import { addSeconds, differenceInSeconds } from "date-fns";
import { isArray, isEmpty, isNil, chunk } from "lodash";
import moment from "moment";
import path from "path";
import { Op, QueryTypes } from "sequelize";
import sequelize from "./database";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import formatBody from "./helpers/Mustache";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import { getIO } from "./libs/socket";
import { getWbot } from "./libs/wbot";
import { getRedis } from "./libs/redis";
import Campaign from "./models/Campaign";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import Company from "./models/Company";
import Contact from "./models/Contact";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import Plan from "./models/Plan";
import Schedule from "./models/Schedule";
import User from "./models/User";
import Whatsapp from "./models/Whatsapp";
import ShowFileService from "./services/FileServices/ShowService";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import { logger } from "./utils/logger";

const nodemailer = require('nodemailer');
const CronJob = require('cron').CronJob;

// Configurações de conexão e limites
const redisConnection = getRedis();

// Configuração corrigida para BullMQ
const connectionOpts: QueueOptions = {
  connection: redisConnection,
  // Definir o prefixo aqui, não no cliente Redis
  prefix: 'zapexpress',
  // Configurações para melhor desempenho e gerenciamento de memória
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 3600, // Remove jobs concluídos após 1 hora
      count: 1000 // Mantém apenas os últimos 1000 jobs concluídos
    },
    removeOnFail: {
      age: 24 * 3600 // Remove jobs falhos após 24 horas
    }
  }
};

// Configurações de limitação de taxa
const limiterMax = parseInt(process.env.REDIS_OPT_LIMITER_MAX || "5", 10);
const limiterDuration = parseInt(process.env.REDIS_OPT_LIMITER_DURATION || "3000", 10);

// Configurações para processamento em lotes
const BATCH_SIZE = parseInt(process.env.CAMPAIGN_BATCH_SIZE || "50", 10);
const MAX_CONCURRENT_BATCHES = parseInt(process.env.MAX_CONCURRENT_BATCHES || "3", 10);

// Interfaces para tipagem
interface ProcessCampaignData {
  id: number;
  delay: number;
}

interface ContactBatchData {
  contacts: {
    contactId: number;
    campaignId: number;
    number?: string;
  }[];
  campaignId: number;
  batchIndex: number;
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  delay: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

// Definição das filas com BullMQ - usando a configuração corrigida
export const userMonitor = new Queue("UserMonitor", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

export const queueMonitor = new Queue("QueueMonitor", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

// Configuração para filas sem limitador
export const messageQueue = new Queue("MessageQueue", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

export const scheduleMonitor = new Queue("ScheduleMonitor", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

export const sendScheduledMessages = new Queue("SendScheduledMessages", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

export const campaignQueue = new Queue("CampaignQueue", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

// Nova fila para processamento em lotes
export const batchCampaignQueue = new Queue("BatchCampaignQueue", connectionOpts);
// Não usar QueueScheduler, não está disponível na versão atual do BullMQ

// Processadores de filas - usando a configuração corrigida
const messageWorkerOpts: WorkerOptions = {
  connection: redisConnection,
  prefix: 'zapexpress',
  concurrency: 5, // Processa até 5 mensagens simultaneamente
  limiter: {
    max: limiterMax,
    duration: limiterDuration
  }
};
const messageWorker = new Worker("MessageQueue", async (job: Job) => {
  try {
    await handleSendMessage(job);
  } catch (e: any) {
    logger.error(`MessageQueue error: ${e.message}`);
    throw e;
  }
}, messageWorkerOpts);

const scheduleMonitorWorker = new Worker("ScheduleMonitor", async (job: Job) => {
  try {
    await handleVerifySchedules(job);
  } catch (e: any) {
    logger.error(`ScheduleMonitor error: ${e.message}`);
    throw e;
  }
}, {
  connection: redisConnection,
  prefix: 'zapexpress',
  concurrency: 1 // Apenas um processo de verificação por vez
});

const sendScheduledMessagesWorker = new Worker("SendScheduledMessages", async (job: Job) => {
  try {
    await handleSendScheduledMessage(job);
  } catch (e: any) {
    logger.error(`SendScheduledMessages error: ${e.message}`);
    throw e;
  }
}, {
  connection: redisConnection,
  prefix: 'zapexpress',
  concurrency: 3 // Processa até 3 mensagens agendadas simultaneamente
});

const campaignQueueWorker = new Worker("CampaignQueue", async (job: Job) => {
  try {
    await handleProcessCampaign(job);
  } catch (e: any) {
    logger.error(`CampaignQueue error: ${e.message}`);
    throw e;
  }
}, {
  connection: redisConnection,
  prefix: 'zapexpress',
  concurrency: 2 // Processa até 2 campanhas simultaneamente
});

// Novo worker para processamento em lotes
const batchWorkerOpts: WorkerOptions = {
  connection: redisConnection,
  prefix: 'zapexpress',
  concurrency: MAX_CONCURRENT_BATCHES, // Processa até MAX_CONCURRENT_BATCHES lotes simultaneamente
  limiter: {
    max: MAX_CONCURRENT_BATCHES,
    duration: 1000
  }
};
const batchCampaignQueueWorker = new Worker("BatchCampaignQueue", async (job: Job) => {
  try {
    await handleProcessContactBatch(job);
  } catch (e: any) {
    logger.error(`BatchCampaignQueue error: ${e.message}`);
    throw e;
  }
}, batchWorkerOpts);

// Manipuladores de eventos para todos os workers
[messageWorker, scheduleMonitorWorker, sendScheduledMessagesWorker, campaignQueueWorker, batchCampaignQueueWorker].forEach(worker => {
  worker.on('completed', (job) => {
    logger.info(`${job.queueName} job ${job.id} completed`);
  });
  
  worker.on('failed', (job, err) => {
    logger.error(`${job.queueName} job ${job.id} failed: ${err.message}`);
    Sentry.captureException(err);
  });
  
  worker.on('error', (err) => {
    logger.error(`Worker error: ${err.message}`);
    Sentry.captureException(err);
  });
});

// Funções de manipulação de jobs
async function handleSendMessage(job: Job) {
  const { data } = job;

  const whatsapp = await Whatsapp.findByPk(data.whatsappId);

  if (whatsapp == null) {
    throw Error("Whatsapp não identificado");
  }

  const messageData: MessageData = data.data;

  await SendMessage(whatsapp, messageData);
}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob('*/1 * * * *', async () => {
    const companies = await Company.findAll();
    companies.map(async c => {
      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
      }
    });
  });
  job.start();
}

async function handleVerifySchedules(job: Job) {
  try {
    // Otimização: Buscar apenas os campos necessários e limitar a quantidade
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [{ 
        model: Contact, 
        as: "contact",
        attributes: ["id", "name", "number", "email", "condominio", "endereco", "cargo"] // Incluindo novos campos
      }],
      limit: 100 // Limitar para evitar sobrecarga
    });
    
    if (count > 0) {
      // Processamento em lotes para agendamentos
      const batches = chunk(schedules, 10);
      
      for (const batch of batches) {
        // Atualizar status em lote
        await Schedule.update(
          { status: "AGENDADA" },
          { where: { id: batch.map(s => s.id) } }
        );
        
        // Adicionar à fila com pequenos delays entre cada mensagem do lote
        batch.forEach((schedule, index) => {
          sendScheduledMessages.add(
            "SendMessage",
            { schedule },
            { 
              delay: 40000 + (index * 1000), // Adicionar delay incremental para cada mensagem
              removeOnComplete: true 
            }
          );
          logger.info(`Disparo agendado para: ${schedule.contact.name}`);
        });
      }
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job: Job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
    
    if (!scheduleRecord) {
      logger.error(`Agendamento não encontrado: ${schedule.id}`);
      return;
    }
    
    const whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve("public", `company${schedule.companyId}`, schedule.mediaPath);
    }

    await SendMessage(whatsapp, {
      number: schedule.contact.number,
      body: formatBody(schedule.body, schedule.contact),
      mediaPath: filePath
    });

    await scheduleRecord.update({
      sentAt: moment().format("YYYY-MM-DD HH:mm"),
      status: "ENVIADA"
    });

    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
    
    // Limpar jobs concluídos periodicamente
    if (Math.random() < 0.1) { // 10% de chance para evitar sobrecarga
      await sendScheduledMessages.clean(15000, 1000);
    }
  } catch (e: any) {
    Sentry.captureException(e);
    if (scheduleRecord) {
      await scheduleRecord.update({
        status: "ERRO"
      });
    }
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job: Job) {
  try {
    // Otimização: Usar índices e limitar a janela de tempo
    const campaigns: { id: number; scheduledAt: string }[] =
      await sequelize.query(
        `SELECT id, "scheduledAt" 
         FROM "Campaigns" 
         WHERE "scheduledAt" BETWEEN now() AND now() + '1 hour'::interval 
         AND status = 'PROGRAMADA'
         ORDER BY "scheduledAt" ASC
         LIMIT 50`,
        { type: QueryTypes.SELECT }
      );

    if (campaigns.length > 0) {
      logger.info(`Campanhas encontradas: ${campaigns.length}`);
    
      for (let campaign of campaigns) {
        try {
          const now = moment();
          const scheduledAt = moment(campaign.scheduledAt);
          const delay = scheduledAt.diff(now, "milliseconds");
          
          logger.info(
            `Campanha enviada para a fila de processamento: Campanha=${campaign.id}, Delay Inicial=${delay}`
          );
          
          await campaignQueue.add(
            "ProcessCampaign",
            {
              id: campaign.id,
              delay
            },
            {
              delay: Math.max(0, delay - 5000), // Iniciar processamento 5 segundos antes
              removeOnComplete: true
            }
          );
        } catch (err: any) {
          Sentry.captureException(err);
          logger.error(`Erro ao processar campanha ${campaign.id}: ${err.message}`);
        }
      }
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error(`Erro ao verificar campanhas: ${e.message}`);
  }
}

async function getCampaign(id: number) {
  // Otimização: Usar cache para campanhas
  const redis = getRedis();
  const cacheKey = `zapexpress:campaign:${id}`;
  
  // Tentar obter do cache primeiro
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // Se não estiver em cache, buscar do banco
  const campaign = await Campaign.findByPk(id, {
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: ["id", "name", "number", "email", "condominio", "endereco", "cargo", "isWhatsappValid"], // Incluindo novos campos
            where: { isWhatsappValid: true }
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name"]
      },
      {
        model: CampaignShipping,
        as: "shipping",
        include: [{ 
          model: ContactListItem, 
          as: "contact",
          attributes: ["id", "name", "number", "email", "condominio", "endereco", "cargo"] // Incluindo novos campos
        }]
      }
    ]
  });
  
  // Salvar no cache com TTL de 5 minutos
  await redis.set(cacheKey, JSON.stringify(campaign), 'EX', 300);
  
  return campaign;
}

async function getContact(id: number) {
  return await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email", "condominio", "endereco", "cargo"] // Incluindo novos campos
  });
}

async function getSettings(campaign: Campaign) {
  // Otimização: Usar cache para configurações
  const redis = getRedis();
  const cacheKey = `zapexpress:campaign:settings:${campaign.companyId}`;
  
  // Tentar obter do cache primeiro
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;
  let variables: any[] = [];

  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = JSON.parse(setting.value);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = JSON.parse(setting.value);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = JSON.parse(setting.value);
    }
    if (setting.key === "variables") {
      variables = JSON.parse(setting.value);
    }
  });

  const result = {
    messageInterval,
    longerIntervalAfter,
    greaterInterval,
    variables
  };
  
  // Salvar no cache com TTL de 10 minutos
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
  
  return result;
}

export function parseToMilliseconds(seconds: number): number {
  return seconds * 1000;
}

async function sleep(seconds: number): Promise<boolean> {
  logger.debug(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.debug(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign: Campaign): string[] {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign: Campaign): string[] {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function getProcessedMessage(msg: string, variables: any[], contact: any): string {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact.name || "");
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact.email || "");
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact.number || "");
  }
  
  // Suporte para novos campos
  if (finalMessage.includes("{condominio}")) {
    finalMessage = finalMessage.replace(/{condominio}/g, contact.condominio || "");
  }
  
  if (finalMessage.includes("{endereco}")) {
    finalMessage = finalMessage.replace(/{endereco}/g, contact.endereco || "");
  }
  
  if (finalMessage.includes("{cargo}")) {
    finalMessage = finalMessage.replace(/{cargo}/g, contact.cargo || "");
  }

  variables.forEach(variable => {
    if (finalMessage.includes(`{${variable.key}}`)) {
      const regex = new RegExp(`{${variable.key}}`, "g");
      finalMessage = finalMessage.replace(regex, variable.value || "");
    }
  });

  return finalMessage;
}

export function randomValue(min: number, max: number): number {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign: Campaign): Promise<void> {
  const { contacts } = campaign.contactList;

  const count1 = contacts.length;
  const count2 = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.not]: null
      }
    }
  });

  if (count1 === count2) {
    await campaign.update({ status: "FINALIZADA", completedAt: moment().toDate() });
    
    // Limpar cache quando a campanha for finalizada
    const redis = getRedis();
    await redis.del(`zapexpress:campaign:${campaign.id}`);
  }

  const io = getIO();
  io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
    action: "update",
    record: campaign
  });
}

function calculateDelay(index: number, baseDelay: Date, longerIntervalAfter: number, greaterInterval: number, messageInterval: number): number {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval;
  } else {
    return diffSeconds * 1000 + messageInterval;
  }
}

// Novo manipulador para processamento em lotes
async function handleProcessContactBatch(job: Job): Promise<void> {
  const { contacts, campaignId, batchIndex } = job.data as ContactBatchData;
  
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      logger.error(`Campanha não encontrada: ${campaignId}`);
      return;
    }
    
    const settings = await getSettings(campaign);
    
    // Preparar todas as mensagens do lote
    const messages = [];
    for (const contactData of contacts) {
      const contact = await getContact(contactData.contactId);
      if (!contact) continue;
      
      const campaignMessages = getCampaignValidMessages(campaign);
      if (campaignMessages.length === 0) continue;
      
      // Selecionar uma mensagem aleatória da campanha
      const messageIndex = Math.floor(Math.random() * campaignMessages.length);
      const message = campaignMessages[messageIndex];
      
      // Processar a mensagem com as variáveis
      const body = getProcessedMessage(message, settings.variables, contact);
      
      messages.push({
        contactId: contact.id,
        body,
        campaignId,
        number: contact.number
      });
    }
    
    // Processar mensagens em paralelo com limite de concorrência
    const results = await Promise.all(
      messages.map(async (message, index) => {
        try {
          // Adicionar pequeno delay entre mensagens do mesmo lote
          await sleep(index * 0.2); // 200ms entre cada mensagem
          
          // Criar ou atualizar registro de envio
          const [campaignShipping] = await CampaignShipping.findOrCreate({
            where: {
              campaignId,
              contactListItemId: message.contactId
            },
            defaults: {
              campaignId,
              contactListItemId: message.contactId,
              body: message.body
            }
          });
          
          // Adicionar à fila de mensagens
          await messageQueue.add(
            "SendMessage",
            {
              whatsappId: campaign.whatsappId,
              data: {
                number: message.number,
                body: message.body
              }
            },
            {
              removeOnComplete: true,
              attempts: 3
            }
          );
          
          // Atualizar status de envio
          await campaignShipping.update({
            deliveredAt: moment().toDate()
          });
          
          return { success: true, contactId: message.contactId };
        } catch (err) {
          logger.error(`Erro ao processar mensagem para contato ${message.contactId}: ${err}`);
          return { success: false, contactId: message.contactId, error: String(err) };
        }
      })
    );
    
    // Verificar se a campanha foi finalizada
    await verifyAndFinalizeCampaign(campaign);
    
    // Log de resultados
    const successCount = results.filter(r => r.success).length;
    logger.info(`Lote ${batchIndex} da campanha ${campaignId} processado: ${successCount}/${messages.length} mensagens enviadas com sucesso`);
    
  } catch (err) {
    logger.error(`Erro ao processar lote ${batchIndex} da campanha ${campaignId}: ${err}`);
    Sentry.captureException(err);
    throw err;
  }
}

// Manipulador de processamento de campanha reescrito para usar lotes
async function handleProcessCampaign(job: Job): Promise<void> {
  try {
    const { id }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    
    if (!campaign) {
      logger.error(`Campanha não encontrada: ${id}`);
      return;
    }
    
    const settings = await getSettings(campaign);
    
    // Atualizar status da campanha
    await campaign.update({ status: "EM_ANDAMENTO" });
    
    const { contacts } = campaign.contactList;
    if (!isArray(contacts) || contacts.length === 0) {
      logger.warn(`Campanha ${id} não possui contatos válidos`);
      await campaign.update({ status: "FINALIZADA", completedAt: moment().toDate() });
      return;
    }
    
    // Dividir contatos em lotes
    const batches = chunk(contacts, BATCH_SIZE);
    logger.info(`Campanha ${id} dividida em ${batches.length} lotes de até ${BATCH_SIZE} contatos`);
    
    // Adicionar cada lote à fila com delay apropriado
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      // Calcular delay entre lotes para evitar bloqueios
      const batchDelay = batchIndex * parseToMilliseconds(settings.messageInterval) * (BATCH_SIZE / 10);
      
      await batchCampaignQueue.add(
        "ProcessContactBatch",
        {
          contacts: batch.map(contact => ({
            contactId: contact.id,
            campaignId: campaign.id,
            number: contact.number
          })),
          campaignId: campaign.id,
          batchIndex
        },
        { 
          delay: batchDelay,
          removeOnComplete: true,
          attempts: 3
        }
      );
      
      logger.info(`Lote ${batchIndex} da campanha ${id} adicionado à fila com delay de ${batchDelay}ms`);
    }
    
    // Notificar frontend sobre início do processamento
    const io = getIO();
    io.to(`company-${campaign.companyId}-mainchannel`).emit(`company-${campaign.companyId}-campaign`, {
      action: "update",
      record: campaign
    });
    
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`Erro ao processar campanha: ${err.message}`);
    throw err;
  }
}

// Inicialização
export const initQueues = async (): Promise<void> => {
  logger.info("Inicializando filas...");
  
  // Adicionar job recorrente para verificar campanhas agendadas
  await scheduleMonitor.add(
    "VerifySchedules",
    {},
    {
      repeat: {
        every: 30000 // A cada 30 segundos
      },
      removeOnComplete: true
    }
  );
  
  // Adicionar job recorrente para verificar campanhas
  await campaignQueue.add(
    "VerifyCampaigns",
    {},
    {
      repeat: {
        every: 60000 // A cada 1 minuto
      },
      removeOnComplete: true
    }
  );
  
  // Iniciar fechamento automático de tickets
  handleCloseTicketsAutomatic();
  
  logger.info("Filas inicializadas com sucesso");
};

// Registrar processadores de jobs recorrentes
scheduleMonitorWorker.on('active', async job => {
  if (job.name === 'VerifySchedules') {
    await handleVerifySchedules(job);
  }
});

campaignQueueWorker.on('active', async job => {
  if (job.name === 'VerifyCampaigns') {
    await handleVerifyCampaigns(job);
  }
});

// Exportar funções úteis para uso em outros módulos
export {
  handleVerifyCampaigns,
  handleVerifySchedules,
  handleProcessCampaign,
  handleProcessContactBatch,
  verifyAndFinalizeCampaign
};

// Função para iniciar o processamento de filas (compatibilidade com código existente)
export const startQueueProcess = async (): Promise<void> => {
  await initQueues();
};
