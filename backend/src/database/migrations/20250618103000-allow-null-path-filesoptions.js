module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('FilesOptions', 'path', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('FilesOptions', 'path', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
}; 