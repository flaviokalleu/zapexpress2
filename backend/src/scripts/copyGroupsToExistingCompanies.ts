import Company from "../models/Company";
import Group from "../models/Group";
import CopyGroupsToCompanyService from "../services/CompanyService/CopyGroupsToCompanyService";

const copyGroupsToExistingCompanies = async () => {
  try {
    console.log("Iniciando cópia de grupos para empresas existentes...");

    // Buscar todas as empresas
    const companies = await Company.findAll({
      order: [["id", "ASC"]]
    });

    console.log(`Encontradas ${companies.length} empresas`);

    for (const company of companies) {
      try {
        console.log(`Processando empresa: ${company.name} (ID: ${company.id})`);
        
        // Verificar se a empresa já tem grupos
        const existingGroups = await Group.findAll({
          where: { companyId: company.id }
        });

        if (existingGroups.length === 0) {
          console.log(`Empresa ${company.name} não possui grupos, copiando...`);
          await CopyGroupsToCompanyService({ companyId: company.id });
        } else {
          console.log(`Empresa ${company.name} já possui ${existingGroups.length} grupos`);
        }
      } catch (error) {
        console.error(`Erro ao processar empresa ${company.name}:`, error);
      }
    }

    console.log("Processo de cópia de grupos concluído!");
  } catch (error) {
    console.error("Erro no script de cópia de grupos:", error);
  }
};

// Executar o script se for chamado diretamente
if (require.main === module) {
  copyGroupsToExistingCompanies()
    .then(() => {
      console.log("Script executado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Erro na execução do script:", error);
      process.exit(1);
    });
}

export default copyGroupsToExistingCompanies; 