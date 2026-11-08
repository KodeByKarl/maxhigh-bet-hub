const base = require("../../ecosystem.config.cjs");
const profile = require("./settings.cjs");
module.exports = { apps: [profile(base.apps.find((item) => item.name === "maxhigh-app"))] };
