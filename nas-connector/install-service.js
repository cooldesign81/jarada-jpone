// 윈도우 서비스로 등록: PC를 켜면 자동으로 시작되고, 멈추면 다시 켜져요. 관리자 권한 명령 프롬프트에서 node install-service.js
const { Service } = require("node-windows"), path = require("path");
const svc = new Service({ name: "JaradaNasConnector", description: "JP ONE 미션허브 제출 파일을 NAS에 저장", script: path.join(__dirname, "connector.js"), wait: 5, grow: 0.5, maxRestarts: 50 });
svc.on("install", () => { svc.start(); console.log("설치 완료. 서비스 이름: JaradaNasConnector (services.msc 에서 확인)"); });
svc.on("alreadyinstalled", () => console.log("이미 설치돼 있어요."));
svc.install();
