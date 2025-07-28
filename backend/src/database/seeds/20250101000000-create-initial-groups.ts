import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const companies = await queryInterface.sequelize.query(
      `SELECT id FROM "Companies";`
    );
    
    const companiesData = companies[0] as any[];
    
    const groupsData = [];
    
    for (const company of companiesData) {
      groupsData.push(
        {
          name: "Esfera",
          companyId: company.id,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "IDE+",
          companyId: company.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      );
    }
    
    return queryInterface.bulkInsert("Groups", groupsData);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Groups", {});
  }
}; 