import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Campaigns", "successRate", {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Campaigns", "successRate", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  }
}; 