'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
     queryInterface.removeConstraint('UserResumes', 'userId-resumeId-UKey-UserResumes');

  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
     queryInterface.addConstraint('UserResumes', {
      fields: ['userId', 'resumeId'],
      type: 'unique',
      name: 'userId-resumeId-UKey-UserResumes'
    });
  }
};
