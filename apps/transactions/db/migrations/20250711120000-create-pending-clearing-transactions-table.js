'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pending_clearing_transactions', {
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
      transaction_data: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      last_retry_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addConstraint('pending_clearing_transactions', {
      fields: ['transaction_correlation_id', 'processor_id'],
      type: 'unique',
      name: 'unique_pending_clearing_transaction_correlation_processor',
    });

    await queryInterface.addIndex('pending_clearing_transactions', ['processor_id']);
    await queryInterface.addIndex('pending_clearing_transactions', ['transaction_correlation_id']);
    await queryInterface.addIndex('pending_clearing_transactions', ['expires_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pending_clearing_transactions');
  },
};
