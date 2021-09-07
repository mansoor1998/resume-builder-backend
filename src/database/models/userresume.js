'use strict';
const {
  Model
} = require('sequelize');

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  class UserResume extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      UserResume.belongsTo( models.User, {  foreignKey: 'userId' } );

      UserResume.belongsTo( models.Resume, {  foreignKey: 'resumeId' } );
    }
  };
  UserResume.init({
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.UUID,
      defaultValue: () => uuidv4()
    },
    userId: {
      type:DataTypes.UUID,  
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    resumeId: {
      type:DataTypes.UUID,
      references: {
        model: 'Resumes',
        key: 'id'
      }
    },
    BodyJson: DataTypes.JSONB,
    htmlFile: DataTypes.STRING,
    pdfFile: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'UserResume',
  });
  return UserResume;
};