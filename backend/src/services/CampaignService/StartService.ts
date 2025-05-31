import Campaign from "../../models/Campaign";
import { CampaignData } from "./interfaces";

const StartService = async (id: string): Promise<Campaign> => {
  const campaign = await Campaign.findByPk(id);
  
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  
  await campaign.update({
    status: "EM_ANDAMENTO"
  });
  
  return campaign;
};

export default StartService;
