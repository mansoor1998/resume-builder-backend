'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    Promise.all([
      await queryInterface.addColumn('Users', 'verified', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }),
      await queryInterface.addColumn('Users', 'isGoogleAuth', {
        type: Sequelize.BOOLEAN
      }),
    ]);

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('userss');
     */
     Promise.all([
      await queryInterface.removeColumn('Users', 'verified'),
      await queryInterface.removeColumn('Users', 'isGoogleAuth'),
    ]);
  }
};
