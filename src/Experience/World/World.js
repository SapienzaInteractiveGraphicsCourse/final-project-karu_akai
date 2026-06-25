import Environment from './Environment.js';
import PortfolioModel from './PortfolioModel.js';

export default class World {
  constructor(experience) {
    this.experience = experience;
    this.environment = new Environment(experience);
    this.portfolioModel = new PortfolioModel(experience);
  }

  update(delta) {
    this.portfolioModel.update(delta);
  }
}
