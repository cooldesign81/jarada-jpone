const { Service } = require("node-windows"), path = require("path");
const svc = new Service({ name: "JaradaNasConnector", script: path.join(__dirname, "connector.js") });
svc.on("uninstall", () => console.log("서비스를 지웠어요.")); svc.uninstall();
