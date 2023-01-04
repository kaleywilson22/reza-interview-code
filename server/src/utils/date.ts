declare global {
  interface Date {
    addHours(hours: number): Date;
    subtractHours(hours: number): Date;
    addMinutes(minutes: number): Date;
    subtractMinutes(minutes: number): Date;
  }
}
Date.prototype.addHours = function (h) {
  this.setTime(this.getTime() + h * 60 * 60 * 1000);
  return this;
};

Date.prototype.subtractHours = function (h) {
  this.setTime(this.getTime() - h * 60 * 60 * 1000);
  return this;
};

Date.prototype.addMinutes = function (m) {
  this.setTime(this.getTime() + m * 60 * 1000);
  return this;
};

Date.prototype.subtractMinutes = function (m) {
  this.setTime(this.getTime() - m * 60 * 1000);
  return this;
};

function roundToNearestMinute(date = new Date()) {
  const minutes = 1;
  const ms = 1000 * 60 * minutes;

  // 👇️ replace Math.round with Math.ceil to always round UP
  return new Date(Math.round(date.getTime() / ms) * ms);
}
export { roundToNearestMinute };
