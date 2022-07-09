
class Chicken {
  name;
  birthday;
  weight;
  steps;
  isRunning;

  constructor(obj, out_db = true) {
    this.name = obj.name;
    if (obj.birthday === undefined || obj.birthday === null) {
      this.birthday = null;
    } else {
      if (out_db) {
        this.birthday = new Date(obj.birthday * 1000);
      } else {
        this.birthday = Date.parse(obj.birthday) / 1000;
      }
    }
    this.weight = obj.weight;
    this.steps = obj.steps;
    this.isRunning = obj.isRunning;
  }
}

module.exports = { Chicken };
