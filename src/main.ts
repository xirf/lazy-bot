import handler from "./libs/commands/handler";
import Client from "./libs/whatsapp/whatsapp";

const client = new Client(handler);
client.connect();