import { AnyMessageContent, proto, makeWASocket } from "@whiskeysockets/baileys";
import logger from "../../utils/logger";

class Message {
    protected readonly message: proto.IWebMessageInfo;
    protected readonly socket: ReturnType<typeof makeWASocket> | null = null;
    protected readonly sender: string;
    protected readonly quoted: proto.Message.IExtendedTextMessage | null = null;
    protected readonly text: string | null = null;
    protected readonly type: string = "unknown";
    protected readonly command: string | null = null;
    protected readonly arg: string;

    private prefix: string = process.env.PREFIX || "/";

    constructor(msg: proto.IWebMessageInfo, socket: ReturnType<typeof makeWASocket>) {
        this.message = msg;
        this.socket = socket;
        this.sender = msg.key.remoteJid;
        this.quoted = msg.message?.extendedTextMessage;
        this.text = msg.message?.conversation
            || msg.message?.imageMessage?.caption
            || msg.message?.videoMessage?.caption
            || msg.message?.extendedTextMessage?.text;

        if (this.text.startsWith(this.prefix)) {
            const [ command, ...args ] = this.text.slice(this.prefix.length).split(" ");

            this.command = command;
            this.arg = args.join(" ");
        }

        const messageTypeMap = {
            imageMessage: "image",
            videoMessage: "video",
            audioMessage: "audio",
            documentMessage: "document",
            contactMessage: "contact",
            locationMessage: "location",
            liveLocationMessage: "liveLocation",
            productMessage: "product",
            buttonsResponseMessage: "buttonsResponse",
            buttonsMessage: "buttons",
            listMessage: "list",
            templateMessage: "template",
            ephemeralMessage: "ephemeral",
            paymentInviteMessage: "paymentInvite",
            reactionMessage: "reaction",
            orderMessage: "order",
            viewOnceMessage: "viewOnce",
            viewOnceMessageV2: "viewOnce",
            poolUpdate: "poolUpdate"
        };

        for (const [ key, value ] of Object.entries(messageTypeMap)) {
            if (this.message.message?.[ key ]) {
                this.type = value;
                return;
            }
        }
    }

    public async reply(params: AnyMessageContent | string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.read();
            if (typeof params === "string") params = { text: params };

            this.socket?.sendMessage(this.message.key.remoteJid, params, {
                quoted: this.message,
            }).then(() => {
                resolve();
            }).catch((error) => {
                logger.warn({ error, msg: "Failed to send message" });
                reject();
            })
        })
    }

    public async sendText(jid: string, text: string): Promise<void> {
        try {
            this.read();
            this.socket?.sendMessage(jid, { text: text, });
        } catch (error) {
            logger.warn({
                error: {
                    message: error.message,
                    stack: error.stack
                },
                msg: `Failed to send message to ${jid}`
            })
        }
    }

    public async read(): Promise<void> {
        this.socket?.readMessages([ this.message.key ])
    }

    public async react(emoji: string): Promise<void> {
        try {
            await this.read();
            await this.socket.sendMessage(this.sender, {
                react: {
                    text: emoji,
                    key: this.message.key
                }
            })
        } catch (error) {
            logger.warn({ error, msg: "Failed to send reaction" })
        }
    }
}

export default Message;