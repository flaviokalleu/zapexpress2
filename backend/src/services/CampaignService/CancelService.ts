import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";

export async function CancelService(id: number) {
  const campaign = await Campaign.findByPk(id);
  await campaign.update({ status: "CANCELADA" });

  const recordsToCancel = await CampaignShipping.findAll({
    where: {
      campaignId: campaign.id,
      jobId: { [Op.not]: null },
      deliveredAt: null
    }
  });

  const promises = [];

  for (let record of recordsToCancel) {
    const job = await campaignQueue.getJob(+record.jobId);
    if (job && typeof job.remove === "function") {
      promises.push(job.remove());
    } else {
      console.warn(`Job não encontrado para o jobId: ${record.jobId}`);
    }
  }

  await Promise.all(promises);
}
