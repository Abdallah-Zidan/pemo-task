'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      processor_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      transaction_correlation_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      authorization_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      clearing_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SETTLED'),
        allowNull: false,
      },
      auth_amount: {
        type: Sequelize.DECIMAL(19, 4),
        allowNull: false,
      },
      clearing_amount: {
        type: Sequelize.DECIMAL(19, 4),
        allowNull: true,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
      },
      card_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mcc: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      reference_number: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      processor_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
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

    await queryInterface.addIndex('transactions', ['processor_id']);
    await queryInterface.addIndex('transactions', ['card_id']);
    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['transaction_correlation_id', 'processor_id'], {
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transactions');
  },
};
