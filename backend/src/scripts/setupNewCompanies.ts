import Company from "../models/Company";
import Group from "../models/Group";
import Whatsapp from "../models/Whatsapp";
import CopyGroupsToCompanyService from "../services/CompanyService/CopyGroupsToCompanyService";

const setupNewCompanies = async () => {
  try {
    console.log("Iniciando configuração completa para empresas existentes...");

    // Buscar todas as empresas
    const companies = await Company.findAll({
      order: [["id", "ASC"]]
    });

    console.log(`Encontradas ${companies.length} empresas`);

    for (const company of companies) {
      try {
        console.log(`\n=== Processando empresa: ${company.name} (ID: ${company.id}) ===`);
        
        // 1. Verificar e copiar grupos
        console.log("1. Verificando grupos...");
        const existingGroups = await Group.findAll({
          where: { companyId: company.id }
        });

        if (existingGroups.length === 0) {
          console.log("   Empresa não possui grupos, copiando...");
          await CopyGroupsToCompanyService({ companyId: company.id });
        } else {
          console.log(`   Empresa já possui ${existingGroups.length} grupos`);
        }

        // 2. Verificar e criar WhatsApp padrão
        console.log("2. Verificando WhatsApp...");
        const existingWhatsapp = await Whatsapp.findOne({
          where: { companyId: company.id }
        });

        if (!existingWhatsapp) {
          console.log("   Empresa não possui WhatsApp, criando...");
          
          await Whatsapp.create({
            name: `WhatsApp ${company.name}`,
            status: "OPENING",
            isDefault: true,
            companyId: company.id,
            greetingMessage: "Olá! Como posso ajudá-lo?",
            complationMessage: "Obrigado por entrar em contato conosco!",
            outOfHoursMessage: "Estamos fora do horário de atendimento. Deixe sua mensagem e retornaremos em breve.",
            provider: "beta"
          });
          
          console.log("   WhatsApp padrão criado com sucesso");
        } else {
          console.log("   Empresa já possui WhatsApp configurado");
        }

        console.log(`=== Empresa ${company.name} processada com sucesso ===\n`);
      } catch (error) {
        console.error(`Erro ao processar empresa ${company.name}:`, error);
      }
    }

    console.log("Processo de configuração completa concluído!");
  } catch (error) {
    console.error("Erro no script de configuração:", error);
  }
};

// Executar o script se for chamado diretamente
if (require.main === module) {
  setupNewCompanies()
    .then(() => {
      console.log("Script executado com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Erro na execução do script:", error);
      process.exit(1);
    });
}

export default setupNewCompanies; 