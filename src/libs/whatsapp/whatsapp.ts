import { Boom } from '@hapi/boom'
import logger from "../../utils/logger";
import Message from './message';

import makeWASocket, {
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    isJidUser
} from '@whiskeysockets/baileys'
import { BaseLogger } from 'pino';

const log: BaseLogger = logger.child({ module: "whatsapp" });

class Client {
    protected socket: ReturnType<typeof makeWASocket>;
    protected command: (message: Message) => void;

    constructor(commandHandler: (message: Message) => void) {
        this.command = commandHandler;
    }

    public async connect() {
        logger.info("Starting WhatsApp client...");
        logger.info("Using Baileys Verison: " + (await fetchLatestBaileysVersion()).version + "...");

        const { state, saveCreds } = await useMultiFileAuthState('sessions');

        const socket = makeWASocket(
            {
                auth: state,
                browser: Browsers.appropriate("Firefox"),
                shouldIgnoreJid: (jid) => !isJidUser(jid),
            }
        );

        this.socket = socket;

        socket.ev.on("connection.update", (update) => {
            const { lastDisconnect, connection } = update;

            if (connection == "connecting") {
                logger.info("Connecting to WhatsApp at " + new Date().toLocaleString().split(", ")[ 1 ]);
            }
            if (connection == "open") {
                logger.info("Connected to WhatsApp as " + socket.user?.name);
                logger.info("Listening for messages...");
            }

            if (connection == "close") {
                log.warn({ lastDisconnect }, "Disconnected from WhatsApp");
                if ((lastDisconnect?.error as Boom).output.statusCode !== DisconnectReason.loggedOut) {
                    log.warn("Reconnecting in 2 seconds");
                    setTimeout(() => {
                        this.connect();
                    }, 2000);
                } else {
                    log.fatal("Logged out, clearing session");

                }
            }

            if (update.qr) {
                log.info("New QR code received, please scan");
            }
        })


        socket.ev.on("creds.update", saveCreds);

        socket.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[ 0 ];
            if (msg.key.fromMe) return;
            const message = new Message(msg, socket);
            logger.info("New message received from " + message.sender);
            this.command(message);
        })

    }

}

export default Client;
