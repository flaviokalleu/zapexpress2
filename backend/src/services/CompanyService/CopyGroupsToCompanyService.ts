import Group from "../../models/Group";
import Company from "../../models/Company";

interface Request {
  companyId: number;
}

const CopyGroupsToCompanyService = async ({ companyId }: Request): Promise<void> => {
  try {
    // Verificar se a empresa existe
    const company = await Company.findByPk(companyId);
    
    if (!company) {
      throw new Error("Empresa não encontrada");
    }

    // Verificar se a empresa já tem grupos
    const existingGroups = await Group.findAll({
      where: { companyId }
    });

    if (existingGroups.length > 0) {
      console.log(`Empresa ${company.name} já possui ${existingGroups.length} grupos`);
      return;
    }

    // Verificar se a Empresa 1 existe
    const templateCompany = await Company.findByPk(1);
    
    if (templateCompany) {
      // Buscar grupos da Empresa 1 (empresa principal)
      const templateGroups = await Group.findAll({
        where: { companyId: 1 },
        order: [["name", "ASC"]]
      });

      // Se existirem grupos na Empresa 1, copiar para a empresa
      if (templateGroups.length > 0) {
        const newGroups = templateGroups.map(group => ({
          name: group.name,
          companyId: companyId
        }));

        await Group.bulkCreate(newGroups);
        console.log(`Copiados ${templateGroups.length} grupos da Empresa 1 para a empresa ${company.name}`);
      } else {
        console.log("Empresa 1 não possui grupos para copiar");
      }
    } else {
      console.log("Empresa 1 não encontrada, não será possível copiar grupos");
    }
  } catch (error) {
    console.error("Erro ao copiar grupos para empresa:", error);
    throw error;
  }
};

export default CopyGroupsToCompanyService; 