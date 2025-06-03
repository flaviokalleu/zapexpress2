import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Campaigns", "successRate", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      }),
      queryInterface.addColumn("Campaigns", "lastDeliveryAt", {
        type: DataTypes.DATE,
        allowNull: true
      }),
      queryInterface.addColumn("Campaigns", "timeoutAt", {
        type: DataTypes.DATE,
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Campaigns", "successRate"),
      queryInterface.removeColumn("Campaigns", "lastDeliveryAt"),
      queryInterface.removeColumn("Campaigns", "timeoutAt")
    ]);
  }
}; 