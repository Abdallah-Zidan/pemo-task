'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cards', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      card_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      credit_limit: {
        type: Sequelize.DECIMAL(19, 4),
        defaultValue: 0,
        allowNull: false,
      },
      available_credit: {
        type: Sequelize.DECIMAL(19, 4),
        defaultValue: 0,
        allowNull: false,
      },
      settled_balance: {
        type: Sequelize.DECIMAL(19, 4),
        defaultValue: 0,
        allowNull: false,
      },
      pending_balance: {
        type: Sequelize.DECIMAL(19, 4),
        defaultValue: 0,
        allowNull: false,
      },
      current_utilization: {
        type: Sequelize.DECIMAL(19, 4),
        defaultValue: 0,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('cards', ['card_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cards');
  },
};
