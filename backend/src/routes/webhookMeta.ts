import express from 'express';
import crypto from 'crypto';

const webhookMetaRouter = express.Router();



// Configurações do webhook
const CONFIG = {
    verifyToken: 'EAAcZCiwmGYckBO3aPbJFcJYSZBDiZCaeYwIZBpWea6A9QC3kZACsB80bp8aGpW2t0lJEAAZAy1HczsnipFZAwpzM0EQRbYskZBZC5g5YeRnfLhPC6ZBoB1Q69j4QVaiZAdZBi04OKTPY63OcNiY9a22zaONvdNIHZAgZAyX3vtq33JwtTZCvYHg2nnauoBVoXcsNNNAESbVLQwCdBqRLEwMdnzq',
    appSecret: process.env.META_APP_SECRET
};


// Middleware para validar a assinatura da Meta
function verifyRequestSignature(req: express.Request, res: express.Response, buf: Buffer) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
        console.warn("Assinatura não encontrada no cabeçalho.");
        return;
    }

    const [, signatureHash] = signature.split('=');
    const expectedHash = crypto
        .createHmac('sha256', CONFIG.appSecret)
        .update(buf)
        .digest('hex');

    if (signatureHash !== expectedHash) {
        console.error("Assinatura inválida!");
        res.sendStatus(403);
        return;
    }
}

// Configura o body-parser para validar a assinatura
webhookMetaRouter.use(express.json({ verify: verifyRequestSignature }));

// Rota GET para verificação do webhook
webhookMetaRouter.get('/webhook', (req: express.Request, res: express.Response) => {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === CONFIG.verifyToken) {
        console.log('WEBHOOK_VERIFICADO');
        res.status(200).send(challenge);
    } else {
        console.error('Token de verificação inválido!');
        res.sendStatus(403);
    }
});

// Rota POST para receber notificações de eventos
webhookMetaRouter.post('/webhook', (req: express.Request, res: express.Response) => {
    const body = req.body;

    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    if (body.object === 'page' || body.object === 'instagram') {
        body.entry.forEach((entry: any) => {
            const webhookEvent = entry.messaging?.[0] || entry.changes?.[0];
            if (webhookEvent) {
                console.log('Evento processado:', webhookEvent);
                if (webhookEvent.message) {
                    const senderId = webhookEvent.sender.id;
                    const messageText = webhookEvent.message.text;
                    console.log(`Mensagem de ${senderId}: ${messageText}`);
                }
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        console.error('Evento não reconhecido!');
        res.sendStatus(404);
    }
});

export default webhookMetaRouter;