'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class Resume extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Resume.hasMany( models.UserResume, { foreignKey: 'resumeId' } );
    }
  };
  Resume.init({
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: () => uuidv4()
    },
    fileName: DataTypes.STRING,
    imagePath: DataTypes.STRING,
    rules: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Resume',
  });
  return Resume;
};