import Campaign from "../../models/Campaign";

const DeleteService = async (id: string): Promise<void> => {
  const record = await Campaign.findByPk(id);
  
  if (!record) {
    throw new Error("Campaign not found");
  }
  
  await record.destroy();
};

export default DeleteService;
